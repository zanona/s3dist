/*global require, module, process*/
function main(d, v, flags, amazonBucket, deployDir) {

    deployDir = deployDir || 'build/';
    var s3 = require('s3'),
        Q = v.require('q'),
        path = require('path'),
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

    v.exec('mktemp -dt XXXXXX').then(function (p) {
        tmpDir = p.replace(/\n/, '');
        return v.exec('cp -r ' + deployDir  + '* ' + tmpDir);
    }).then(function () {
        return Q.all(v.getFilteredFileList(tmpDir, /\.(html|js|css)/).map(function (f) {
            return v.exec('wc -c <"' + f + '"')
                .then(function (size) {
                    sizeMap[f] = size.replace(/\s/g, '');
                })
                .then(function () {
                    return v.exec('gzip -9 ' + f);
                })
                .then(function () {
                    f = f + '.gz';
                    v.mv(f, f.replace(/\.gz$/, ''));
                });
        }));
    }).done(function () {
        params.localDir = tmpDir;
        uploader = client.uploadDir(params);
        uploader.on('error', d.reject);
        //on end being triggered before upload finishes
        //uploader.on('end', function() { d.resolve('Done Uploading'); });
    });
}

module.exports = {
    summary: 'Sync directory to Amazon S3 Bucket',
    run: main
};
