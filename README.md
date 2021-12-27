# qoijs

[![NPM version](https://badge.fury.io/js/qoijs.svg)](http://badge.fury.io/js/qoijs)

"[Quite-OK Image format](https://qoiformat.org/)" encoder/decoder in vanilla javascript.

## Installing

With [npm](https://www.npmjs.com/) do:

```
npm install qoijs
```

With [yarn](https://yarnpkg.com/) do:

```
yarn add qoijs
```

A compiled version for web browsers is also available on a CDN:

```html
<script src="https://cdn.jsdelivr.net/gh/kchapelier/qoijs@1.0.0/build/qoijs.min.js"></script>
```

## Public API

### Functions

**decode(arrayBuffer[, byteOffset[, byteLength[, outputChannels]]])**

Decode a QOI file given as an ArrayBuffer.

Returns a literal containing the color data as a TypedArray and all the metadata of the image.

- *arrayBuffer:* ArrayBuffer containing the QOI file.
- *byteOffset:* Offset to the start of the QOI file in arrayBuffer, defaults to the 0.
- *byteLength:* Length of the QOI file in bytes, defaults to the remaining length of arrayBuffer after byteOffset.
- *outputChannels:* Number of channels to include in the decoded array (used to remove or add the alpha channel), defaults to the number of channels contained in the QOI file.

```js
const QOI = require('qoijs');

// using fs in node to read the content of a file as a Buffer
const buffer = require('fs').readFileSync('some_image.qoi');
const decodedData = QOI.decode(buffer.buffer, buffer.byteOffset, buffer.byteLength);
```

```js
// using FileReader to read a file retrieved from a drop event as an ArrayBuffer
const reader = new FileReader();
reader.readAsArrayBuffer(file);
reader.onloadend = function () {
    const arrayBuffer = reader.result;
    const decodedData = QOI.decode(arrayBuffer);
};
```

**encode(colorData, description)**

Encode a QOI file.

Returns an ArrayBuffer containing the QOI file content.

- *colorData:* Flat array containing the color information for each pixel of the image (from left to right, top to bottom). Must be either an instance of Uint8Array or Uint8ClampedArray.
- *description:*
    - *width:* The width of the image.
    - *height:* The height of the image.
    - *channels:* The number of channels of the image.
        - 3: RGB, 4: RGBA
    - *colorspace:* The color space used to encode the colors in colorData.
        - 0: sRGB with linear alpha, 1: linear

```js
const QOI = require('qoijs');

// encode a 2x2 b/w checkerboard pattern from an arbitrary colorData array
const colorData = new Uint8Array([0,0,0,255, 255,255,255,255, 255,255,255,255, 0,0,0,0]);
const arrayBuffer = QOI.encode(colorData, {
    width: 2,
    height: 2,
    channels: 4,
    colorspace: 0
});
```

```js
// encode the content of a 2D canvas (ImageData)
const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
const arrayBuffer = QOI.encode(imageData.data, {
    width: imageData.width,
    height: imageData.height,
    channels: 4,
    colorspace: 0
});
```

## History

### [1.0.0](https://github.com/kchapelier/qoijs/tree/1.0.0) (2021-12-27) :

- First release

## How to contribute ?

For new features and other enhancements, please make sure to contact me beforehand, either on [Twitter](https://twitter.com/kchplr) or through an issue on Github.

## License

MIT