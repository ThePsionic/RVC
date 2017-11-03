const jimp = require('jimp');
const Tesseract = require('tesseract.js');
const robot = require('robotjs');
const EventEmitter = require('events');

class Emitter extends EventEmitter {}
const ee = new Emitter();

var ttD = {};
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

const init = () => {
	mousePosReinit();
	//robot.setMouseDelay(0.5);
	mouse();
};

const mousePosReinit = () => {
	mousePos.y = 30;
	mousePos.x = 0;
};

const mouse = () => {
	let screenSize = robot.getScreenSize();
	for (mousePos.x; mousePos.x < screenSize.width; mousePos.x += 25) {
		let screenshot = robot.screen.capture(robot.getMousePos().x - 350, robot.getMousePos().y, 700, 300);
		processScreenie(screenshot);

		if (mousePos.x >= screenSize.width - 30) {
			if (mousePos.y >= screenSize.height && foundTooltip == true) {
				console.log('End of screen scan');
				mousePosReinit();
				process.exit(0);
			} else {
				mousePos.x = 0;
				mousePos.y += 40;
			}
		}

		robot.moveMouse(mousePos.x, mousePos.y);
	}
};

const processScreenie = screenshot => {
	let image = new jimp(screenshot.width, screenshot.height, (err, img) => {
		img.bitmap.data = screenshot.image;
		img.scan(0, 0, img.bitmap.width, img.bitmap.height, (x, y, idx) => {
			var red   = img.bitmap.data[ idx + 0 ];
			var blue  = img.bitmap.data[ idx + 2 ];
			img.bitmap.data[ idx + 0 ] = blue;
			img.bitmap.data[ idx + 2 ] = red;
		});
		findTooltipLeft(img);
	});
};

const findTooltipLeft = img => {
	for (let i = 0; i < img.bitmap.height; i++) {
		for (let j = 0; j < img.bitmap.width; j++) {
			let color = img.getPixelColor(j, i);
			if (color == 0x000000FF) {
				if (img.getPixelColor(j - 1, i - 1) == 0x14232BFF) {
					if (img.getPixelColor(j - 2, i - 2) == 0x111F27FF) {
						console.log(`Top left found at ${j}, ${i}`);
						ttD.tlF = true;
						ttD.tlX = j;
						ttD.tlY = i;
						findTooltipRight(img);
					}
				}
			}
		}
	}
};

const findTooltipRight = img => {
	for (let i = 0; i < img.bitmap.height; i++) {
		for (let j = 0; j < img.bitmap.width; j++) {
			let color = img.getPixelColor(j, i);
			if (color == 0x000000FF) {
				if (img.getPixelColor(j + 1, i + 1) == 0x14232BFF) {
					if (img.getPixelColor(j + 2, i + 2) == 0x111F27FF) {
						console.log(`Bottom Right found at ${j}, ${i}`);
						ttD.brF = true;
						ttD.brX = j;
						ttD.brY = i;
						checkValidity(img);
					}
				}
			}
		}
	}
};

const checkValidity = (img) => {
	if (ttD.tlF && ttD.brF) {
		console.log('Tooltip found, let\'s go!');
		foundTooltip = true;
		extractInfo(img);
	} else {
		console.log('No tooltip found. Going back to the mouse loop.');
		ee.emit('mouse');
	}
};

const extractInfo = image => {
	let tooltip = image.clone();
	console.log(tooltip.getExtension());
	tooltip.crop(ttD.tlX, ttD.tlY, (ttD.brX - ttD.tlX), (ttD.brY - ttD.tlY));
};

init();
