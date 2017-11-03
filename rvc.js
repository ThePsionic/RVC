const jimp = require('jimp');
const Tesseract = require('tesseract.js');
const robot = require('robotjs');

var ttD = {};
var textColors = [ 
	0xFFFF00FF, //Yellow (NPCs)
	0x00FFFFFF, //Cyan (In-world objects)
	0xACC3C3FF, //Grey 1 (Free-to-play items)
	0xB8D1D1FF, //Grey 2 (Free-to-play items)
	0xF8D56BFF, //Orange 1 (Member's items, banked items)
	0xE7C764FF  //Orange 2 (Member's items, banked items)
];


// Speed up the mouse.
robot.setMouseDelay(0.5);

var screenSize = robot.getScreenSize();
var height = screenSize.height;
var width = screenSize.width;
var y = 20;

for (var x = 0; x < width; x++) {
	let screenshot = robot.screen.capture(robot.getMousePos().x - 350, robot.getMousePos().y, 700, 300);
	processScreenie(screenshot);
	if (x == (width - 5)) {
		if (y >= height) {
			
		} else {
			//console.log("aaa");
			x = 0;
			y += 40;
		}
	}
	robot.moveMouse(x, y);
}

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

jimp.read('./img/test_cbow.png', function(err, img) {
	if (err) {
		console.log(err);
		return;
	}

	console.log('Looking for top left...');
	tlloop:
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
						break tlloop;
					}
				}
			}
		}
	}

	if (ttD.tlF) {
		console.log('Looking for bottom right...');
		brloop:
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
							break brloop;
						}
					}
				}
			}
		}
	}

	if (ttD.tlF && ttD.brF) {
		let tooltip = img.clone();
		tooltip.crop(ttD.tlX, ttD.tlY, (ttD.brX - ttD.tlX), (ttD.brY - ttD.tlY))
			.write(`./img/tit.${img.getExtension()}`);
		let tooltipNoExtended = tooltip.clone();
		if (tooltipNoExtended.bitmap.width > 320) {
			tooltipNoExtended.crop(0, 0, tooltipNoExtended.bitmap.width, 33);
		} else if (tooltipNoExtended.bitmap.width <= 320) {
			tooltipNoExtended.crop(0, 0, tooltipNoExtended.bitmap.width, 19);
		}
		tooltipNoExtended.write('./img/tooltipnoextended.png');
		let objecttooltip = tooltipNoExtended.clone();
		let commandtooltip = tooltipNoExtended.clone();
		
		console.log('Looking for the object...');
		objectloop:
		for (let i = 0; i < objecttooltip.bitmap.height; i++) {
			for (let j = 0; j < objecttooltip.bitmap.width; j++) {
				let color = objecttooltip.getPixelColor(j, i);
				if (textColors.includes(color)) {
					console.log(`found on ${j}, ${i}`);
					objecttooltip.crop(j - 5, 0, objecttooltip.bitmap.width - (j - 5), objecttooltip.bitmap.height).scale(2)
						.write(`./img/tooltipobject.${img.getExtension()}`, function(error) {
							if (error) {
								console.log(error); 
								return;
							}
							Tesseract.recognize('./img/tooltipobject.png').then(result => {
								console.log(`Object is ${result.text.trim().replace('\n', ' ')}`);
							});
						});
					break objectloop;
				}
			}
		}

		console.log('Looking for the command...');
		commandloop:
		for (let i = 0; i < commandtooltip.bitmap.height; i++) {
			for (let j = 0; j < commandtooltip.bitmap.width; j++) {
				let color = commandtooltip.getPixelColor(j, i);
				if (textColors.includes(color)) {
					commandtooltip.crop(0, 0, j - 5, commandtooltip.bitmap.height).scale(2)
						.write(`./img/tooltipcommand.${img.getExtension()}`, function(error) {
							if (error) {
								console.log(error);
								return;
							}
							Tesseract.recognize('./img/tooltipcommand.png').then(result => {
								console.log(`Command is ${result.text.trim().replace('\n', ' ')}`);
							});
						});
					break commandloop;
				}
			}
		}
	} else {
		console.log('Failed to find some or all elements. Sorry!');
	}
});
