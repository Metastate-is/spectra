import { Command, CommandRunner } from 'nest-commander';

@Command({
  name: 'help',
  description: 'Citadel CLI help',
  options: {
    isDefault: true,
  },
})
export class DefaultCommand extends CommandRunner {
  async run(_inputs: string[], _options: Record<string, any>): Promise<void> {
    console.log('Citadel CLI');
    console.log('');
    console.log('Available commands:');
    console.log('  serve         Start the NestJS server');
    console.log('  stellar-sync  Synchronize data with Stellar blockchain');
    console.log('');
    console.log('For more information on a specific command, run:');
    console.log('  <command> --help');
  }
}
