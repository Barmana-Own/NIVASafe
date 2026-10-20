import path from 'node:path';
export function assertRollbackTarget({entry,oldEntry,newEntry,indexHash,oldIndexHash,newIndexHash,configHash,oldConfigHash,newConfigHash,envHash,originalEnvHash}){
  if(![oldEntry,newEntry].map(x=>path.resolve(x).toLowerCase()).includes(path.resolve(entry).toLowerCase()))throw Error('Rollback refused: another backend release is active');
  if(![oldIndexHash,newIndexHash].includes(indexHash))throw Error('Rollback refused: frontend changed after this release');
  if(![oldConfigHash,newConfigHash].includes(configHash))throw Error('Rollback refused: service configuration changed after this release');
  if(envHash.toLowerCase()!==originalEnvHash.toLowerCase())throw Error('Rollback refused: protected runtime settings changed; reconcile without reverting secrets');
}
