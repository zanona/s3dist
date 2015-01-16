Volo S3Deploy
===

A [volo](https://github.com/volojs/volo) command for deploying
a directory to an Amazon S3 Bucket with gzip support.

### Installation
Install this command via npm into the project's local
`node_modules` directory:

    npm install volo-s3deploy

Then, in the volofile for the project, create a volo command name that
does a require() for this command, and pass it the buildDir and pagesDir to use:

```javascript
//in the volofile
module.exports = {
    //Creates a local project command called `pack`
    s3deploy: require('volo-s3deploy')
}
```

## Usage

While in the project directory, just type:

    volo s3deploy

## License
MIT and new BSD.
