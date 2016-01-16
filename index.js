require('babel-core/register');
require('reacquire')({register: true});
const program = require('./src/program').default;
const argv = process.argv;
if (argv[0].indexOf('node.exe') > -1) {
  argv.shift();
}
program.parse(argv);
