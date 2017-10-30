const jimp = require('jimp');
const Tesseract = require('tesseract.js');

var ttD = {};

jimp.read('./img/test_band.png', function(err, img) {
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
				//console.log('Found a black pixel! Time to check if it\'s from the tooltip...');
				if (img.getPixelColor(j - 1, i - 1) == 0x14232BFF) {
					//console.log('Top left also found! One more for good luck...');
					if (img.getPixelColor(j - 2, i - 2) == 0x111F27FF) {
						console.log(`We definitely found the top left at ${j}, ${i}!`);
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
					//console.log('Found a black pixel! Time to check if it\'s from the tooltip...');
					if (img.getPixelColor(j + 1, i + 1) == 0x14232BFF) {
						//console.log('Bottom right also found! One more for good luck...');
						if (img.getPixelColor(j + 2, i + 2) == 0x111F27FF) {
							console.log(`We definitely found the bottom right at ${j}, ${i}!`);
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
		console.log('We have enough info to extract the tooltip!!!');
		let tooltip = img.clone();
		tooltip.crop(ttD.tlX, ttD.tlY, (ttD.brX - ttD.tlX), (ttD.brY - ttD.tlY))
			.scale(2);
		let objecttooltip = tooltip.clone();
		let commandtooltip = tooltip.clone();
		
		console.log('Looking for the object...');
		objectloop:
		for (let i = 0; i < objecttooltip.bitmap.height; i++) {
			for (let j = 0; j < objecttooltip.bitmap.width; j++) {
				let color = objecttooltip.getPixelColor(j, i);
				if (color == 0x00d9d9FF) {
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
				if (color == 0x00d9d9FF) {
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
