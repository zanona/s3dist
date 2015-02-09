/*global require, module, process, console*/
/*eslint no-console:0*/
module.exports = function(deployDir, amazonBucket, amazonKey, amazonSecret) {

    amazonKey    = amazonKey    || process.env.AMAZON_KEY;
    amazonSecret = amazonSecret || process.env.AMAZON_SECRET;
    if (!deployDir)    { return console.error('Missing source directory'); }
    if (!amazonBucket) { return console.error('Missing Amazon Bucket name'); }
    if (!amazonKey)    { return console.error('Missing Amazon Key'); }
    if (!amazonSecret) { return console.error('Missing Amazon Secret'); }

    var fs = require('fs'),
        path = require('path'),
        exec = require('exec-sync'),
        s3 = require('s3'),
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
                console.log('>', path.relative(tmpDir, localFile));
                var p = {};
                if (localFile.match(/\.(html|js|json|css)/)) {
                    p.ContentEncoding = 'gzip';
                    p.Metadata = { 'raw-content-length': sizeMap[localFile] };
                }
                if (localFile.match(/\.(html)/)) {
                    p.CacheControl = 'no-cache';
                }
                if (localFile.match(/\.(js|json|css)/)) {
                    p.CacheControl = 'max-age=31536000';
                }
                if (localFile.match(/\.(jpg|png|gif)/)) {
                    p.CacheControl = 'max-age=31536000';
                }
                callback(null, p);
            }
        },
        uploader;

    tmpDir = exec('mktemp -dt XXXXXX').replace(/\n/, '');
    exec('cp -r ' + deployDir  + '* ' + tmpDir);

    fs.readdirSync(tmpDir).forEach(function (f) {
        if (!f.match(/\.(html|js|json|css)$/)) { return; }
        f = path.resolve(tmpDir, f);
        var size = exec('wc -c <"' + '/' + f + '"');
        sizeMap[f] = size.replace(/\s/g, '');
        exec('gzip -9 ' + f);
        exec('mv ' + f + '.gz' + ' ' + f);
    });

    params.localDir = tmpDir;
    uploader = client.uploadDir(params);
    uploader.on('error', function (error) { console.error(error);});
    //on end being triggered before upload finishes
    //uploader.on('end', function() { d.resolve('Done Uploading'); });
};
