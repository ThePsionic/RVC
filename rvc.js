const jimp = require('jimp');
const chroma = require('chroma-js');

var topleft_x, topleft_y, bottomright_x, bottomright_y;
var topleft_found = false, bottomright_found = false;

jimp.read('./img/test.png', function(err, img) {
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
						topleft_found = true;
						topleft_x = j;
						topleft_y = i;
						break tlloop;
					}
				}
			}
		}
	}

	if (topleft_found) {
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
							bottomright_found = true;
							bottomright_x = j;
							bottomright_y = i;
							break brloop;
						}
					}
				}
			}
		}
	}

	if (topleft_found && bottomright_found) {
		console.log('We have enough info to extract the tooltip!!!');
		img.crop(topleft_x, topleft_y, (bottomright_x - topleft_x), (bottomright_y - topleft_y));
		img.write(`./img/tooltip.${img.getExtension()}`);
	} else {
		console.log('Failed to find some or all elements. Sorry!');
	}
});
