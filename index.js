/*global require, module, process*/
function main(d, v, flags, amazonBucket, deployDir) {

    deployDir = deployDir || 'build/';
    var s3 = require('s3'),
        Q = v.require('q'),
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
                var p = {
                        ContentEncoding: 'gzip',
                        Metadata: { 'raw-content-length': sizeMap[localFile] }
                    };
                if (localFile.match(/\.js|\.css/)) {
                    p.CacheControl = 'max-age=31536000';
                }
                callback(null, p);
            }
        },
        tmpDir,
        uploader;

    v.exec('mktemp -dt boilerplate').then(function (p) {
        tmpDir = p.replace(/\n/, '');
        return v.exec('cp ' + deployDir  + '* ' + p);
    }).then(function () {
        return Q.all(v.getFilteredFileList(tmpDir).map(function (f) {
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
        uploader.on('progress', function() {
          //console.log('progress', uploader.progressAmount, uploader.progressTotal);
        });
        uploader.on('end', function() {
          d.resolve('Done Uploading');
        });
    });
}

module.exports = {
    summary: 'Sync directory to Amazon S3 Bucket',
    run: main
};
