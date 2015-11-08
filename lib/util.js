
var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');

function walkdir(dir) {

    var parent = path.dirname(dir);
    if ( !fs.existsSync(parent) ) {
        walkdir(parent);
    }
    if ( !fs.existsSync(dir) ) {
        fs.mkdir(dir);
    }
}

exports.download = function(src, target) {
    var options = url.parse(src);
    var req = http.request(options, function(res){
        if (res.statusCode === 200) {
            // check dir exists.
            walkdir(path.dirname(target));

            var file = fs.createWriteStream(target, {
                flags: 'a',
                encoding: 'binary'
            });
            file.on('finish', function(){
                file.close()
            });

            res.on('error', function(err){
                file.end();
                // console.log("\n", '[ERROR] res error:', err, "\n")
                process.stdout.write('.');
            });
            res.on('data', function(chunk){
                file.write(chunk);
            });
            res.on('end', function(){
                file.end();
            });
        }
        else {
            // console.log("\n", '[WARN] res.statusCode', res.statusCode, "\n");
            process.stdout.write('.');
        }
    });

    setTimeout(function(){
        req.abort();
    }, 10000);

    req.on('error', function(err){
        // console.log("\n", '[ERROR] req error:', err, "\n");
        process.stdout.write('.');
    });

    req.end();
}

exports.mix = function() {
    var args = [].slice.call(arguments);
    var src = args[0] || {};
    for( var i=1; i<args.length; i++ ) {
        var tar = args[i];
        for(var k in tar) {
            if (tar.hasOwnProperty(k) && tar[k]) {
                src[k] = tar[k];
            }
        }
    }
    return src;
}
