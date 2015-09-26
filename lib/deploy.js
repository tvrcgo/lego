
var gulp = require('gulp');
var tar = require('gulp-tar');
var gzip = require('gulp-gzip');

var deploy = exports;

deploy.pkg = function(options){

    gulp.src(['*', '!node_modules/', '!.git/'])
        .pipe(tar(opitons.name))
        .pipe(gzip())
        .pipe(gulp.dest(options.to));

};

deploy.unpkg = function(options){

};

deploy.push = function(options){

};

deploy.accept = function(){

};
