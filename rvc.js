const jimp = require('jimp');
const Tesseract = require('tesseract.js');

var ttD = {};

jimp.read('./img/test_mena.png', function(err, img) {
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
			.scale(2)
			.write(`./img/tit.${img.getExtension()}`);
		let objecttooltip = tooltip.clone();
		let commandtooltip = tooltip.clone();
		
		console.log('Looking for the object...');
		objectloop:
		for (let i = 0; i < objecttooltip.bitmap.height; i++) {
			for (let j = 0; j < objecttooltip.bitmap.width; j++) {
				let color = objecttooltip.getPixelColor(j, i);
				if (color == 0x00d9d9FF || color == 0xffff00FF) {
					objecttooltip.crop(j - 10, 0, objecttooltip.bitmap.width - (j - 10), objecttooltip.bitmap.height)
						.write(`./img/tooltipobject.${img.getExtension()}`, function(error) {
							if (error) {
								console.log(error); 
								return;
							}
							Tesseract.recognize('./img/tooltipobject.png').then(result => {
								console.log(`Object is ${result.text.trim()}`);
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
				if (color == 0x00d9d9FF || color == 0xffff00FF) {
					commandtooltip.crop(0, 0, j - 10, commandtooltip.bitmap.height)
						.write(`./img/tooltipcommand.${img.getExtension()}`, function(error) {
							if (error) {
								console.log(error);
								return;
							}
							Tesseract.recognize('./img/tooltipcommand.png').then(result => {
								console.log(`Command is ${result.text.trim()}`);
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
