/*jslint node:true*/
module.exports = function (deployDir, amazonBucket, amazonKey, amazonSecret) {
    'use strict';

    amazonKey    = amazonKey    || process.env.AWS_ACCESS_KEY_ID;
    amazonSecret = amazonSecret || process.env.AWS_SECRET_ACCESS_KEY;
    if (!deployDir) { return console.error('Missing source directory'); }
    if (!amazonBucket) { return console.error('Missing Amazon Bucket name'); }
    if (!amazonKey) { return console.error('Missing Amazon Key'); }
    if (!amazonSecret) { return console.error('Missing Amazon Secret'); }

    /*jslint stupid:true*/
    var fs = require('fs'),
        path = require('path'),
        exec = require('child_process').execSync,
        s3 = require('s3'),
        gzipList = /\.(html|xml|svg|js|json|css|txt|md)$/,
        tmpDir,
        sizeMap = {},
        client = s3.createClient({
            s3Options: {
                accessKeyId: amazonKey,
                secretAccessKey: amazonSecret,
                region: 'eu-west-1'
            }
        }),
        params = {
            localDir: deployDir || 'build',
            deleteRemoved: true,
            s3Params: { Bucket: amazonBucket },
            getS3Params: function (localFile, stat, callback) {
                /*jslint unparam:true*/
                console.log('>', path.relative(tmpDir, localFile));
                var p = {};
                if (localFile.match(gzipList)) {
                    p.ContentEncoding = 'gzip';
                    p.Metadata = { 'raw-content-length': sizeMap[localFile] };
                }
                if (localFile.match(/\.(html)/)) {
                    p.CacheControl = 'no-cache';
                } else {
                    p.CacheControl = 'max-age=31536000';
                }
                callback(null, p);
            }
        },
        uploader;

    tmpDir = exec('mktemp -dt XXXXXX').toString().replace(/\n/, '');
    exec('cp -r ' + deployDir  + '* ' + tmpDir);

    fs.readdirSync(tmpDir).forEach(function (f) {
        if (!f.match(gzipList)) { return; }
        f = path.resolve(tmpDir, f);
        var size = exec('wc -c <"' + '/' + f + '"').toString();
        sizeMap[f] = size.replace(/\s/g, '');
        exec('gzip -9 ' + f);
        exec('mv ' + f + '.gz' + ' ' + f);
    });

    params.localDir = tmpDir;
    uploader = client.uploadDir(params);
    uploader.on('error', function (error) {
        console.error(error);
    });
    //on end being triggered before upload finishes
    //uploader.on('end', function() { d.resolve('Done Uploading'); });
};
