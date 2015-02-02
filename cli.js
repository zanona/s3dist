#!/usr/bin/env node
/*global require, process*/
require('./').apply(null, process.argv.splice(2));
