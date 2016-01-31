require('babel-core/register');
const program = require('./build/program').default;
program.parse(process.argv);
