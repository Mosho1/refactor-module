import program from 'commander';
import commands from './commands';

export default program.version('0.0.1');

program
  .command('generate-tree <entry>')
  .option('-o, --out <value>', 'set output file')
  .description('generate the initial module tree')
  .action((entry, {out}) => {
    commands.generateTree(entry, {out});
    process.exit(0);
  });

program
  .command('refactor <entry>')
  .description('refactor the module')
  .option('-o, --out <value>', 'set output directory')
  .option('-t, --tree <value>', 'set tree file location')
  .action((entry, {tree, out}) => {
    commands.refactor(entry, {tree, out});
    process.exit(0);
  });

program.parse(process.argv);
