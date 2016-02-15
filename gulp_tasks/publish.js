var gulp = require('gulp');

gulp.task('publish', function () {
    var ghPages = require('gulp-gh-pages');

    return gulp.src('./app/**/*')
        .pipe(ghPages());
});
