'use strict';

const AWS = require('aws-sdk');
const S3 = new AWS.S3({
  signatureVersion: 'v4',
});
const Sharp = require('sharp');

const BUCKET = process.env.BUCKET;
const URL = process.env.URL;
const CACHE_CONTROL = process.env.CACHE_CONTROL;

exports.handler = function(event, context, callback) {
  const key = event.queryStringParameters.key;
  const match = key.match(/(\d+)x(\d+)\/(.*)/);
  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);
  const originalKey = match[3];

  S3.getObject({Bucket: BUCKET, Key: originalKey}).promise()
    .then(data => Sharp(data.Body)
      .resize(width, height)
      .max()
      .toFormat('png')
      .toBuffer()
    )
    .then(buffer => S3.putObject({
      Body: buffer,
      Bucket: BUCKET,
      ContentType: 'image/png',
      CacheControl: CACHE_CONTROL,
      Key: key,
    }).promise()
    )
    .then(() => callback(null, {
      statusCode: '301',
      headers: {'location': `${URL}/${key}`},
      body: '',
    })
    )
    .catch(err =>  {
      console.error("Got error while processing '" + originalKey + "' with width " + width + " and height " + height + " passed from " + key);
      callback(err)
    });
}
