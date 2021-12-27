(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.QOI = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

/**
 * Decode a QOI file given as an ArrayBuffer.
 *
 * @param {ArrayBuffer} arrayBuffer ArrayBuffer containing the QOI file.
 * @param {int|null} [byteOffset] Offset to the start of the QOI file in arrayBuffer
 * @param {int|null} [byteLength] Length of the QOI file in bytes
 * @param {int|null} [outputChannels] Number of channels to include in the decoded array
 *
 * @returns {{channels: number, data: Uint8Array, colorspace: number, width: number, error: boolean, height: number}}
 */
function decode (arrayBuffer, byteOffset, byteLength, outputChannels) {
    if (typeof byteOffset === 'undefined' || byteOffset === null) {
        byteOffset = 0;
    }

    if (typeof byteLength === 'undefined' || byteLength === null) {
        byteLength = arrayBuffer.byteLength - byteOffset;
    }

    const uint8 = new Uint8Array(arrayBuffer, byteOffset, byteLength);

    const magic1 = uint8[0];
    const magic2 = uint8[1];
    const magic3 = uint8[2];
    const magic4 = uint8[3];

    const width = ((uint8[4] << 24) | (uint8[5] << 16) | (uint8[6] << 8) | uint8[7]) >>> 0;
    const height = ((uint8[8] << 24) | (uint8[9] << 16) | (uint8[10] << 8) | uint8[11]) >>> 0;

    const channels = uint8[12];
    const colorspace = uint8[13];

    if (typeof outputChannels === 'undefined' || outputChannels === null) {
        outputChannels = channels;
    }

    if (magic1 !== 0x71 || magic2 !== 0x6F || magic3 !== 0x69 || magic4 !== 0x66) {
        throw new Error('QOI.decode: The signature of the QOI file is invalid');
    }

    if (channels < 3 || channels > 4) {
        throw new Error('QOI.decode: The number of channels declared in the file is invalid');
    }

    if (colorspace > 1) {
        throw new Error('QOI.decode: The colorspace declared in the file is invalid');
    }

    if (outputChannels < 3 || outputChannels > 4) {
        throw new Error('QOI.decode: The number of channels for the output is invalid');
    }

    const pixelLength = width * height * outputChannels;
    const result = new Uint8Array(pixelLength);

    let arrayPosition = 14;

    const index = new Uint8Array(64 * 4);
    let indexPosition = 0;

    let red = 0;
    let green = 0;
    let blue = 0;
    let alpha = 255;

    const chunksLength = byteLength - 8;

    let run = 0;
    let pixelPosition = 0;

    for (; pixelPosition < pixelLength && arrayPosition < byteLength - 4; pixelPosition += outputChannels) {
        if (run > 0) {
            run--;
        } else if (arrayPosition < chunksLength) {
            const byte1 = uint8[arrayPosition++];

            if (byte1 === 0b11111110) { // QOI_OP_RGB
                red = uint8[arrayPosition++];
                green = uint8[arrayPosition++];
                blue = uint8[arrayPosition++];
            } else if (byte1 === 0b11111111) { // QOI_OP_RGBA
                red = uint8[arrayPosition++];
                green = uint8[arrayPosition++];
                blue = uint8[arrayPosition++];
                alpha = uint8[arrayPosition++];
            } else if ((byte1 & 0b11000000) === 0b00000000) { // QOI_OP_INDEX
                red = index[byte1 * 4];
                green = index[byte1 * 4 + 1];
                blue = index[byte1 * 4 + 2];
                alpha = index[byte1 * 4 + 3];
            } else if ((byte1 & 0b11000000) === 0b01000000) { // QOI_OP_DIFF
                red += ((byte1 >> 4) & 0b00000011) - 2;
                green += ((byte1 >> 2) & 0b00000011) - 2;
                blue += (byte1 & 0b00000011) - 2;

                // handle wraparound
                red = (red + 256) % 256;
                green = (green + 256) % 256;
                blue = (blue + 256) % 256;
            } else if ((byte1 & 0b11000000) === 0b10000000) { // QOI_OP_LUMA
                const byte2 = uint8[arrayPosition++];
                const greenDiff = (byte1 & 0b00111111) - 32;
                const redDiff = greenDiff + ((byte2 >> 4) & 0b00001111) - 8;
                const blueDiff = greenDiff + (byte2 & 0b00001111) - 8;

                // handle wraparound
                red = (red + redDiff + 256) % 256;
                green = (green + greenDiff + 256) % 256;
                blue = (blue + blueDiff + 256) % 256;
            } else if ((byte1 & 0b11000000) === 0b11000000) { // QOI_OP_RUN
                run = byte1 & 0b00111111;
            }

            indexPosition = ((red * 3 + green * 5 + blue * 7 + alpha * 11) % 64) * 4;
            index[indexPosition] = red;
            index[indexPosition + 1] = green;
            index[indexPosition + 2] = blue;
            index[indexPosition + 3] = alpha;
        }

        if (outputChannels === 4) { // RGBA
            result[pixelPosition] = red;
            result[pixelPosition + 1] = green;
            result[pixelPosition + 2] = blue;
            result[pixelPosition + 3] = alpha;
        } else { // RGB
            result[pixelPosition] = red;
            result[pixelPosition + 1] = green;
            result[pixelPosition + 2] = blue;
        }
    }

    if (pixelPosition < pixelLength) {
        throw new Error('QOI.decode: Incomplete image');
    }

    // checking the 00000001 padding is not required, as per specs

    return {
        width: width,
        height: height,
        colorspace: colorspace,
        channels: outputChannels,
        data: result
    };
}

module.exports = decode;
},{}],2:[function(require,module,exports){
"use strict";

/**
 * Encode a QOI file.
 *
 * @param {Uint8Array|Uint8ClampedArray} colorData Array containing the color information for each pixel of the image (left to right, top to bottom)
 * @param {object} description
 * @param {int} description.width Width of the image
 * @param {int} description.height Height of the image
 * @param {int} description.channels Number of channels in the image (3: RGB, 4: RGBA)
 * @param {int} description.colorspace Colorspace used in the image (0: sRGB with linear alpha, 1: linear)
 *
 * @returns {ArrayBuffer} ArrayBuffer containing the QOI file content
 */
function encode (colorData, description) {
    const width = description.width;
    const height = description.height;
    const channels = description.channels;
    const colorspace = description.colorspace;

    let red = 0;
    let green = 0;
    let blue = 0;
    let alpha = 255;
    let prevRed = red;
    let prevGreen = green;
    let prevBlue = blue;
    let prevAlpha = alpha;

    let run = 0;
    let p = 0;
    const pixelLength = width * height * channels;
    const pixelEnd = pixelLength - channels;

    if (width < 0 || width >= 4294967296) {
        throw new Error('QOI.encode: Invalid description.width');
    }

    if (height < 0 || height >= 4294967296) {
        throw new Error('QOI.encode: Invalid description.height');
    }

    if (colorData.constructor.name !== 'Uint8Array' && colorData.constructor.name !== 'Uint8ClampedArray') {
        throw new Error('QOI.encode: The provided colorData must be instance of Uint8Array or Uint8ClampedArray');
    }

    if (colorData.length !== pixelLength) {
        throw new Error('QOI.encode: The length of colorData is incorrect');
    }

    if (channels !== 3 && channels !== 4) {
        throw new Error('QOI.encode: Invalid description.channels, must be 3 or 4');
    }

    if (colorspace !== 0 && colorspace !== 1) {
        throw new Error('QOI.encode: Invalid description.colorspace, must be 0 or 1');
    }

    const maxSize = width * height * (channels + 1) + 14 + 8;
    const result = new Uint8Array(maxSize);
    const index = new Uint8Array(64 * 4);

    // 0->3 : magic "qoif"
    result[p++] = 0x71;
    result[p++] = 0x6F;
    result[p++] = 0x69;
    result[p++] = 0x66;

    // 4->7 : width
    result[p++] = (width >> 24) & 0xFF;
    result[p++] = (width >> 16) & 0xFF;
    result[p++] = (width >> 8) & 0xFF;
    result[p++] = width & 0xFF;

    // 8->11 : height
    result[p++] = (height >> 24) & 0xFF;
    result[p++] = (height >> 16) & 0xFF;
    result[p++] = (height >> 8) & 0xFF;
    result[p++] = height & 0xFF;

    // 12 : channels, 13 : colorspace
    result[p++] = channels;
    result[p++] = colorspace;

    for (let pixelPos = 0; pixelPos < pixelLength; pixelPos += channels) {
        if (channels === 4) {
            red = colorData[pixelPos];
            green = colorData[pixelPos + 1];
            blue = colorData[pixelPos + 2];
            alpha = colorData[pixelPos + 3];
        } else {
            red = colorData[pixelPos];
            green = colorData[pixelPos + 1];
            blue = colorData[pixelPos + 2];
        }

        if (prevRed === red && prevGreen === green && prevBlue === blue && prevAlpha === alpha) {
            run++;

            // reached the maximum run length, or reached the end of colorData
            if (run === 62 || pixelPos === pixelEnd) {
                // QOI_OP_RUN
                result[p++] = 0b11000000 | (run - 1);
                run = 0;
            }
        } else {
            if (run > 0) {
                // QOI_OP_RUN
                result[p++] = 0b11000000 | (run - 1);
                run = 0;
            }

            const indexPosition = ((red * 3 + green * 5 + blue * 7 + alpha * 11) % 64) * 4;

            if (index[indexPosition] === red && index[indexPosition + 1] === green && index[indexPosition + 2] === blue && index[indexPosition + 3] === alpha) {
                result[p++] = indexPosition / 4;
            } else {
                index[indexPosition] = red;
                index[indexPosition + 1] = green;
                index[indexPosition + 2] = blue;
                index[indexPosition + 3] = alpha;

                if (alpha === prevAlpha) {
                    // ternary with bitmask handles the wraparound
                    let vr = red - prevRed;
                    vr = vr & 0b10000000 ? (vr - 256) % 256 : (vr + 256) % 256;
                    let vg = green - prevGreen;
                    vg = vg & 0b10000000 ? (vg - 256) % 256 : (vg + 256) % 256;
                    let vb = blue - prevBlue;
                    vb = vb & 0b10000000 ? (vb - 256) % 256 : (vb + 256) % 256;

                    const vg_r = vr - vg;
                    const vg_b = vb - vg;

                    if (vr > -3 && vr < 2 && vg > -3 && vg < 2 && vb > -3 && vb < 2) {
                        // QOI_OP_DIFF
                        result[p++] = 0b01000000 | (vr + 2) << 4 | (vg + 2) << 2 | (vb + 2);
                    } else if (vg_r > -9 && vg_r < 8 && vg > -33 && vg < 32 && vg_b > -9 && vg_b < 8) {
                        // QOI_OP_LUMA
                        result[p++] = 0b10000000 | (vg + 32);
                        result[p++] = (vg_r + 8) << 4 | (vg_b + 8);
                    } else {
                        // QOI_OP_RGB
                        result[p++] = 0b11111110;
                        result[p++] = red;
                        result[p++] = green;
                        result[p++] = blue;
                    }
                } else {
                    // QOI_OP_RGBA
                    result[p++] = 0b11111111;
                    result[p++] = red;
                    result[p++] = green;
                    result[p++] = blue;
                    result[p++] = alpha;
                }
            }
        }

        prevRed = red;
        prevGreen = green;
        prevBlue = blue;
        prevAlpha = alpha;
    }

    // 00000001 end marker/padding
    result[p++] = 0;
    result[p++] = 0;
    result[p++] = 0;
    result[p++] = 0;
    result[p++] = 0;
    result[p++] = 0;
    result[p++] = 0;
    result[p++] = 1;

    // return an ArrayBuffer trimmed to the correct length
    return result.buffer.slice(0, p);
}

module.exports = encode;
},{}],3:[function(require,module,exports){
"use strict";

const QOI = {};

QOI.decode = require('./decode');
QOI.encode = require('./encode');

module.exports = QOI;
},{"./decode":1,"./encode":2}]},{},[3])(3)
});
