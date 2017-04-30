'use strict';
/*eslint no-sync: 0*/

module.exports = function(grunt) {
    require('time-grunt')(grunt);
    require('jit-grunt')(grunt);

    grunt.config.init({
        clean: {
            options: {
                force: true
            },
            dot: 'true',
            target: {
                src: [
                    'target/**'
                ]
            }
        },
        jsbeautifier: {
            full: {
                options: {
                    config: '.jsbeautifyrc'
                },
                src: [
                    'package.json',
                    'index.js',
                    'lib/**/*.js',
                    'test/**/*.js'
                ]
            }
        },
        eslint: {
            full: {
                options: {
                    configFile: '.eslintrc.js'
                },
                src: [
                    'index.js',
                    'lib/**'
                ]
            }
        },
        mochaTest: {
            full: {
                options: {
                    timeout: 2000,
                    reporter: 'spec'
                },
                src: ['test/**/*spec.js']
            }
        },
        mocha_istanbul: {
            coverage: {
                src: 'test/**/*spec.js',
                options: {
                    coverageFolder: 'target/coverage/report',
                    root: 'lib',
                    check: {
                        lines: 70,
                        statements: 70,
                        branches: 50,
                        functions: 70
                    },
                    reportFormats: ['html', 'lcovonly']
                }
            }
        },
        coveralls: {
            options: {
                force: true
            },
            full: {
                src: 'target/coverage/report/*.info'
            }
        }
    });

    grunt.registerTask('localtest', [
        'clean:target',
        'eslint:full',
        'mocha_istanbul:coverage'
    ]);

    grunt.registerTask('build', [
        'jsbeautifier:full',
        'localtest'
    ]);

    grunt.registerTask('test', [
        'localtest',
        'coveralls:full'
    ]);
};
