import { app } from '../src/index';
import { initDatabase } from '../src/db';
import { seedDatabase } from '../src/db/seed';
async function start(){ await initDatabase(); await seedDatabase(); app.listen(3101,'127.0.0.1',()=>console.log('Browser test API ready')); }
start().catch(e=>{console.error(e);process.exit(1);});
