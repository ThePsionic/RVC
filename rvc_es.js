const jimp = require('jimp');
const Tesseract = require('tesseract.js');
const robot = require('robotjs');
const EventEmitter = require('events');

class Emitter extends EventEmitter {}
const ee = new Emitter();

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
		if (foundTooltip) {
			break;
		} else {
			robot.moveMouse(mousePos.x, mousePos.y);
		}

		let ttD = {};
		ttD.screenshot = robot.screen.capture(robot.getMousePos().x - 350, robot.getMousePos().y, 700, 300);
		ttD.mouseX = mousePos.x;
		ttD.mouseY = mousePos.y;
		processScreenie(Object.assign({}, ttD));

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
		//extractInfo(img);
		moveMouseFinally(ttD);
	} else {
		console.log('No tooltip found. Going back to the mouse loop.');
		ee.emit('mouse');
	}
};

const moveMouseFinally = ttD => {
	setTimeout(() => {
		robot.moveMouse(ttD.mouseX - 25, ttD.mouseY);
		extractInfo(ttD);
	}, 500);
};

const extractInfo = ttD => {
	let tooltip = ttD.img.clone();
	console.log(tooltip.getExtension());
	tooltip.crop(ttD.tlX, ttD.tlY, (ttD.brX - ttD.tlX), (ttD.brY - ttD.tlY))
		.write('./img/aaaaa.png');
};

init();
