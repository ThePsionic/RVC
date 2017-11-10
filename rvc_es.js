const jimp = require('jimp');
const Tesseract = require('tesseract.js');
const robot = require('robotjs');
const sql = require('sqlite');

const readline = require('readline');
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

var objectInput;

var foundTooltip = false;
var mousePos = {};
var textColors = [ 
	0xFFFF00FF, //Yellow (NPCs)
	0x00FFFFFF, //Cyan (In-world objects)
	0xACC3C3FF, //Grey 1 (Free-to-play items)
	0xB8D1D1FF, //Grey 2 (Free-to-play items)
	0xF8D56BFF, //Orange 1 (Member's items, banked items)
	0xE7C764FF  //Orange 2 (Member's items, banked items)
];
// If there's time, we should hard-code locations or sprites
// for UI elements and the likes

const init = () => {
	databaseSetup();
	mousePosReinit();
	awaitInput();
};

const reinit = () => {
	mousePosReinit();
	awaitInput();
};

const databaseSetup = () => {
	sql.open('./db/db.sqlite').then(() => {
		sql.run('CREATE TABLE IF NOT EXISTS tooltips (base64 TEXT PRIMARY KEY, object TEXT NOT NULL)').catch(err2 => {
			if (err2) console.log('Error creating table tooltips (catch): ' + err2);
		});
	});
};

const mousePosReinit = () => {
	mousePos.y = 30;
	mousePos.x = 0;
};

const awaitInput = () => {
	rl.question('Please input an object!', object => {
		objectInput = object.toString().trim();
		if (objectInput != '') {
			console.log('object input!');
			console.log(`Your input: You want to find the/a(n) ${objectInput}.`);
			let ttD = {};
			ttD.requestedObject = objectInput;
			mouse(ttD);
		}
	});
};

const mouse = ttD => {
	let screenSize = robot.getScreenSize();

	for (mousePos.x; mousePos.x < screenSize.width; mousePos.x += 25) {
		if (foundTooltip) {
			break;
		} else {
			robot.moveMouse(mousePos.x, mousePos.y);
		}

		ttD.screenshot = robot.screen.capture(robot.getMousePos().x - 350, robot.getMousePos().y, 700, 300);
		ttD.mouseX = mousePos.x;
		ttD.mouseY = mousePos.y;
		processScreenie(copy(ttD));

		if (mousePos.x >= screenSize.width - 30) {
			if (mousePos.y >= screenSize.height) {
				console.log('End of screen scan');

				mousePosReinit();
				process.exit(0);
			} else {
				mousePos.x = 0;
				mousePos.y += 40;
			}
		}
	}
};

const processScreenie = ttD => {
	let image = new jimp(ttD.screenshot.width, ttD.screenshot.height);
	for (var x = 0; x < ttD.screenshot.width; x++) {
		for (var y = 0; y < ttD.screenshot.height; y++) {
			var index = (y * ttD.screenshot.byteWidth) + (x * ttD.screenshot.bytesPerPixel);
			var red = ttD.screenshot.image[index];
			var grn = ttD.screenshot.image[index + 1];
			var blu = ttD.screenshot.image[index + 2];
			var num = (red * 256) + (grn * 256 * 256) + (blu * 256 * 256 * 256) + 255;
			image.setPixelColor(num, x, y);
		}
	}
	ttD.img = image;
	findTooltipLeft(ttD);
};

const findTooltipLeft = ttD => {
	for (let i = 0; i < ttD.img.bitmap.height; i++) {
		for (let j = 0; j < ttD.img.bitmap.width; j++) {
			let color = ttD.img.getPixelColor(j, i);
			if (color == 0x000000FF) {
				if (ttD.img.getPixelColor(j - 1, i - 1) == 0x14232BFF) {
					if (ttD.img.getPixelColor(j - 2, i - 2) == 0x111F27FF) {
						console.log(`Top left found at ${j}, ${i}`);
						ttD.tlF = true;
						ttD.tlX = j;
						ttD.tlY = i;
						findTooltipRight(ttD);
					}
				}
			}
		}
	}
};

const findTooltipRight = ttD => {
	for (let i = 0; i < ttD.img.bitmap.height; i++) {
		for (let j = 0; j < ttD.img.bitmap.width; j++) {
			let color = ttD.img.getPixelColor(j, i);
			if (color == 0x000000FF) {
				if (ttD.img.getPixelColor(j + 1, i + 1) == 0x14232BFF) {
					if (ttD.img.getPixelColor(j + 2, i + 2) == 0x111F27FF) {
						console.log(`Bottom Right found at ${j}, ${i}`);
						ttD.brF = true;
						ttD.brX = j;
						ttD.brY = i;
						checkValidity(ttD);
					}
				}
			}
		}
	}
};

const checkValidity = ttD => {
	if (ttD.tlF && ttD.brF) {
		console.log('Tooltip found, let\'s go!');
		foundTooltip = true;
		extractInfo(ttD);
	} else {
		console.log('No tooltip found. Going back to the mouse loop.');
		
	}
};

const extractInfo = ttD => {
	let tooltip = ttD.img.clone();
	tooltip.crop(ttD.tlX, ttD.tlY, (ttD.brX - ttD.tlX), (ttD.brY - ttD.tlY));
	ttD.tooltip = tooltip;
	smallerTooltip(ttD);
};

const smallerTooltip = ttD => {
	let smallTT = ttD.tooltip.clone();
	if (smallTT.bitmap.width > 320) {
		smallTT.crop(0, 0, smallTT.bitmap.width, 33);
	} else if (smallTT.bitmap.width <= 320) {
		smallTT.crop(0, 0, smallTT.bitmap.width, 19);
	}
	ttD.smallTT = smallTT;
	ttD.objecttooltip = smallTT.clone();
	checkDatabaseBypass(ttD);
};

const checkDatabaseBypass = ttD => { 
	console.log('Starting bypass check...');
	ttD.smallTT.getBase64('image/png', (err, result) => {
		console.log(`B64 length: ${result.length}`);
		sql.get(`SELECT * FROM tooltips WHERE base64="${result}"`).then(row => {
			if (!row) {
				console.log('Going into OCR...');
				readObject(ttD);
			} else {
				console.log('Bypassing OCR...');
				ttD.objectText = row.object;
				console.log('Database said: object: ' + ttD.objectText);
				checkName(ttD);
			}
		}).catch(err2 => {
			if (err2) throw err2;
		});
	});
};

const readObject = ttD => {
	let objecttooltip = ttD.objecttooltip;
	let found = false;
	for (let i = 0; i < objecttooltip.bitmap.height; i++) {
		for (let j = 0; j < objecttooltip.bitmap.width; j++) {
			let color = objecttooltip.getPixelColor(j, i);
			if (textColors.includes(color)) {
				found = true;
				objecttooltip.crop(j - 5, 0, objecttooltip.bitmap.width - (j - 5), objecttooltip.bitmap.height).scale(2)
					.write('./img/tooltipobject.png', function(error) {
						console.log('writing tooltip object');
						if (error) {
							console.log(error); 
							return;
						}
						Tesseract.recognize('./img/tooltipobject.png').then(result => {
							ttD.objectText = result.text.trim().replace('\n', ' ');
							console.log(`Object is ${ttD.objectText}`);
							addToDatabase(ttD);
						});
					});
			}
		}
	}
	if (!found) {
		console.log('Tooltip contained no object name - skipping!');
		foundTooltip = false;
		let newttD = {};
		newttD.requestedObject = ttD.requestedObject;
		mouse(newttD);
	}
};

const addToDatabase = ttD => {
	ttD.smallTT.getBase64('image/png', (err, result) => {
		console.log('addToDatabase result length: ' + result.length);
		ttD.objectText = cleanText(ttD.objectText);
		sql.run('INSERT INTO tooltips VALUES (?,?)', result, ttD.objectText).then(() => {
			checkName(ttD);
		}).catch(err2 => {
			if (err2) throw err2;
		});
	});
};

const cleanText = text => {
	return text.replace('—', '-').replace(/( (?:'|‘)|(?:'|‘) )/g, '');
};

const checkName = ttD => {
	if (ttD.objectText.toLowerCase() == ttD.requestedObject.toLowerCase()) {
		console.log('Names matches, time to stop!');
		moveMouseFinally(ttD);
	} else {
		console.log('Names don\'t match, time to continue');
		foundTooltip = false;
		let newttD = {};
		newttD.requestedObject = ttD.requestedObject;
		mouse(newttD);
	}
};

const moveMouseFinally = ttD => {
	setTimeout(() => {
		robot.moveMouse(ttD.mouseX - 25, ttD.mouseY);
		robot.mouseClick();
		robot.moveMouse(ttD.mouseX, ttD.mouseY - 25);
		finalFunction(ttD);
	}, 500);
};

const finalFunction = ttD => {
	setTimeout(() => {
		foundTooltip = false;
		reinit();
		//process.exit(0);
	}, 5000);
};

const copy = object => {
	return Object.assign({}, object);
};

init();
