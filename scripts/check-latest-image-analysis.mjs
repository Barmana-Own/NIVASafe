import {PrismaClient} from '../backend/node_modules/@prisma/client/default.js';
const p=new PrismaClient();
try {
 const actions=['FMEA_PROCESS_IMAGE_ANALYSIS','RULA_POSTURE_IMAGE_ANALYSIS','FMEA_PROCESS_IMAGE_ANALYSIS_FAILED','RULA_POSTURE_IMAGE_ANALYSIS_FAILED'];
 const logs=await p.auditLog.findMany({where:{action:{in:actions},createdAt:{gte:new Date('2026-10-10T10:45:00Z')}},select:{createdAt:true,action:true,userId:true}});
 console.log(JSON.stringify({eventsAfterRelease:logs.length,successfulAccounts:new Set(logs.filter(x=>!x.action.endsWith('FAILED')).map(x=>x.userId)).size,failedEvents:logs.filter(x=>x.action.endsWith('FAILED')).length}));
} finally {await p.$disconnect();}
