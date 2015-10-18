/* 
 * 
 * 
 * Is suppose to minifi all related files except external files like 
 * firebase.js, clean build dir, and copy everything in the build dir
 * 
 * + a release mod that copys everything into unitys template dir
 * 
 * -> after that unity finishes the rest
 */
module.exports = function(grunt) {

  // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        copy:{
            build:{
                cwd:'src',
                src:['**'],
                dest:'build',
                expand:true
            },
            toUnityTemplate:{
                src:'build/webrtcnetworkplugin.js',
                dest:'../unitywebrtc/Assets/WebGLTemplates/WebRtcNetwork/webrtcnetworkplugin.js'
            },
            toUnityResource:{
                src:'build/webrtcnetworkplugin.js',
                dest:'../unitywebrtc/Assets/WebRtcNetwork/Resources/webrtcnetworkplugin.txt'
            }
        },
        clean:{
            build:{
                src:'build'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                mangle: false
            },
            build: {
                src: 'src/*.js',
                dest: 'build/webrtcnetworkplugin.js'
            }
        },
        karma: {
            unit: {
                configFile: 'karma.conf.js'
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    
    grunt.registerTask(
        'build',
        'Compiles all the assets and copies the files to the build directory.',
       [ 'clean', 'uglify', 'copy' ]
    );

    // Default task(s).
    grunt.registerTask('default', ['copy']);
    // Default task(s).
    grunt.registerTask('ToUnity', ['uglify']);
    grunt.registerTask('karma', ['karma']);
};