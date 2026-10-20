import {PrismaClient} from '../backend/node_modules/@prisma/client/default.js';
const p=new PrismaClient();
try { console.log(JSON.stringify(await p.auditLog.findMany({where:{action:{in:['FMEA_PROCESS_IMAGE_ANALYSIS_FAILED','RULA_POSTURE_IMAGE_ANALYSIS_FAILED']}},select:{createdAt:true,action:true,metadata:true},orderBy:{createdAt:'desc'},take:6}))); } finally { await p.$disconnect(); }
