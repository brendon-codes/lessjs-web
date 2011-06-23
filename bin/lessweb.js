#!/usr/bin/env node

/**
 * Less.js Web Converter for Node.js
 *
 * Author: Brendon Crawford
 * Homepage: https://github.com/last/lessweb
 */

/*jslint white: true, devel: true, rhino: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: false, bitwise: true, regexp: true, newcap: true, immed: true, maxlen: 80 */
/*global require, setInterval, clearInterval, process */
"use strict";


var Fs = require('fs');
var Less = require('less');
var Http = require('http');
var Optparse = require('optparse');
var Path = require('path');


var LessWeb = {};
LessWeb.options = null;


/**
 * Request Handler
 *
 * Args:
 *   req (Http.ServerRequest)
 *   res (Http.ServerResponse)
 *
 * Returns: boolean
 */
LessWeb.request = function (req, res) {
    var fpath, fstat;
    fpath = LessWeb.getPath(LessWeb.options.root, req.url);
    console.log('Request ' + req.url + ' ' + fpath);
    if (fpath === null) {
        LessWeb.err(res);
        return false;
    }
    if (LessWeb.fileStat(fpath) !== 1) {
        LessWeb.err(res);
        return false;
    }
    Fs.readFile(fpath, 'utf-8', function (err1, data1) {
        if (err1) {
            LessWeb.err(res);
            return false;
        }
        LessWeb.process(res, fpath, data1);
        return true;
    });
    return true;
};


/**
 * Send data to be processed by LessJS
 *
 * Args:
 *  res (Http.ServerResponse)
 *  data (string)
 *
 * Returns: boolean
 */
LessWeb.process = function (res, fpath, data) {
    var lessParser, opts;
    opts = {
        paths: [Path.dirname(fpath)],
        filename: Path.basename(fpath)
    };
    lessParser = new(Less.Parser)(opts);
    try {
        lessParser.parse(data, function (err, tree) {
            if (err) {
                console.error(err);
                LessWeb.err(res);
                return false;
            }
            LessWeb.write(res, tree.toCSS());
            return true;
        });
    }
    catch (e) {
        console.error('Parser encountered an unknown error: ' + e);
        LessWeb.err(res);
        return false;
    }
    return true;
};


/**
 *  Start Server
 *
 * Args:
 *   listen (string)
 *   port (integer)
 *
 * Returns: boolean
 */
LessWeb.startServer = function (listen, port) {
    Http.createServer(LessWeb.request).listen(port, listen);
    return true;
};


/**
 * Write Out Css
 *
 * Args:
 *   res (Http.ServerRequest)
 *   data (string)
 *
 * Returns: boolean
 */
LessWeb.write = function (res, data) {
    res.writeHead(200, {'Content-Type': 'text/css'});
    res.end(data);
    return true;
};


/**
 * Write Out an Error
 *
 * Args:
 *   res (Http.ServerRequest)
 *
 * Returns: boolean
 */
LessWeb.err = function (res) {
    res.writeHead(404, {'Content-Type': 'text/css'});
    res.end('');
    return true;
};


/**
 * Constructs a Path
 *
 * Args:
 *   root (string)
 *   url (string)
 *
 * Returns: string
 */
LessWeb.getPath = function (root, url) {
    var fparts, dparts, pth, i, _i, out;
    if (url.length <= 1) {
        return null;
    }
    pth = url.slice(1);
    dparts = pth.split('/');
    fparts = dparts[dparts.length - 1].split('.');
    if (fparts.length < 2 || fparts[fparts.length - 1] !== 'less') {
        return null;
    }
    for (i = 0, _i = dparts.length; i < _i; i++) {
        if (dparts[i][0] === '.' || dparts[i][0] === '') {
            return null;
        }
    }
    out = [root, pth].join('/');
    return out;
};


/**
 * Gets File Information
 *
 * Args:
 *   fpath (string)
 *
 * Returns: integer
 *   0 - File does not exist
 *   1 - File is a file
 *   2 - File is a directory
 */
LessWeb.fileStat = function (fpath) {
    var s, exists, type;
    exists = true;
    try {
        s = Fs.statSync(fpath);
    }
    catch (e) {
        exists = false;
    }
    if (exists) {
        type = (s.isDirectory() ? 2 : 1);
    }
    else {
        type = 0;
    }
    return type;
};


/**
 * Setup Command Line Options
 *
 * Args:
 *   args (Array)
 *
 * Returns: Object
 */
LessWeb.getOptions = function (args) {
    var opts, optParser;
    opts = {
        'help' : false,
        'port' : 61775,
        'listen' : '127.0.0.1',
        'root' : null
    };
    optParser = new Optparse.OptionParser([
        ['-h', '--help', 'Show this help.'],
        ['-p', '--port NUMBER', 'Port to listen on. Default is 61775.'],
        ['-s', '--listen', 'Interface to listen on. Default is "127.0.0.1".']
    ]);
    optParser.banner = "Usage: node lessweb.js ROOT [OPTIONS]";
    optParser.on('help', function (val) {
        opts.help = true;
        return true;
    });
    optParser.on(2, function (val) {
        var fpath, fstat;
        fpath = (val.slice(-1) === '/' ? val.slice(0, -1) : val);
        fstat = LessWeb.fileStat(fpath);
        if (fstat === 0) {
            console.error(fpath + ' does not exist');
            process.exit(1);
        }
        else if (fstat !== 2) {
            console.error(fpath + ' is not a directory');
            process.exit(1);
        }
        else {
            opts.root = fpath;
        }
        return true;
    });
    optParser.on('port', function (name, val) {
        opts.port = parseInt(val, 10);
        return true;
    });
    optParser.on('listen', function (name, val) {
        opts.listen = val;
        return true;
    });
    optParser.parse(args);
    if (opts.help) {
        console.log(optParser.toString());
        console.log();
        console.log('ROOT is the root directory from ' +
                    'which files .less files are retrieved.');
        process.exit(0);
    }
    else if (opts.root === null) {
        console.error('ROOT is required')
        process.exit(1);
    }
    return opts;
};


/**
 * Main
 *
 * Args:
 *   args (Array)
 *
 * Returns: integer
 */
LessWeb.main = function (args) {
    LessWeb.options = LessWeb.getOptions(args);
    LessWeb.startServer(LessWeb.options.listen, LessWeb.options.port);
    return 0;
};


LessWeb.main(process.argv);

