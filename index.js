/*global require, module, process, console*/
/*eslint no-console:0*/
module.exports = function(amazonBucket, deployDir) {

    if (!amazonBucket) { return console.log('Missing Amazon Bucket name'); }
    deployDir = deployDir || 'build/';
    var fs = require('fs'),
        path = require('path'),
        exec = require('exec-sync'),
        s3 = require('s3'),
        tmpDir,
        sizeMap = {},
        client = s3.createClient({
            s3Options: {
                accessKeyId: process.env.AMAZON_KEY,
                secretAccessKey: process.env.AMAZON_SECRET,
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
                if (localFile.match(/\.(html|js|css)/)) {
                    p.ContentEncoding = 'gzip';
                    p.Metadata = { 'raw-content-length': sizeMap[localFile] };
                }
                if (localFile.match(/\.(html)/)) {
                    p.CacheControl = 'no-cache';
                }
                if (localFile.match(/\.(js|css)/)) {
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
        if (!f.match(/\.(html|js|css)$/)) { return; }
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
