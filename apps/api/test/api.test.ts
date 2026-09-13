import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { initDatabase } from '../src/db';
import { seedDatabase } from '../src/db/seed';

let adminToken = '';
let userToken = '';

beforeAll(async () => {
  await initDatabase();
  await seedDatabase();

  // Login as Admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@pixellift.test', password: 'Demo123!' });
  expect(adminRes.status).toBe(200);
  adminToken = adminRes.body.token;

  // Login as User
  const userRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user@pixellift.test', password: 'Demo123!' });
  expect(userRes.status).toBe(200);
  userToken = userRes.body.token;
});

describe('1. Health & Authentication', () => {
  it('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/auth/register should create new user', async () => {
    const email = `newuser_${Date.now()}@pixellift.test`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Testing User', email, password: 'Password123!' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.token).toBeDefined();
  });

  it('Role Authorization: Normal user should be forbidden from Admin Users endpoint', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});

describe('2. Users CRUD & CSV Export', () => {
  it('GET /api/users with Admin token should return paginated users list', async () => {
    const res = await request(app)
      .get('/api/users?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });

  it('GET /api/users/export/csv should return CSV content', async () => {
    const res = await request(app)
      .get('/api/users/export/csv')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });

  it('POST /api/users/bulk should execute bulk suspend', async () => {
    const res = await request(app)
      .post('/api/users/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: ['usr_alex'], action: 'suspend' });
    expect(res.status).toBe(200);

    // Re-activate
    await request(app)
      .post('/api/users/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: ['usr_alex'], action: 'activate' });
  });
});

describe('3. Background Removal & AI Engine', () => {
  it('POST /api/background/remove should reject unsupported formats', async () => {
    const res = await request(app)
      .post('/api/background/remove')
      .attach('image', Buffer.from('fake txt file'), 'test.txt');
    expect(res.status).toBe(400);
  });

  it('POST /api/background/remove should process valid image buffer', async () => {
    const sharp=(await import('sharp')).default;
    const {readFileSync,mkdirSync,writeFileSync}=await import('node:fs');
    const testPng=readFileSync('../web/public/demo-portrait.jpg');

    const res = await request(app)
      .post('/api/background/remove')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('image', testPng, 'sample.png');

    expect(res.status).toBe(200);
    expect(res.body.resultImageUrl).toContain('data:image/png;base64');
    expect(res.body.confidence === null || typeof res.body.confidence === 'number').toBe(true);
    expect(['IS-Net DIS5K 1024px (High Precision)', 'BiRefNet General Lite (ONNX CPU)']).toContain(res.body.modelUsed);
    expect(res.body.isMock).toBe(false);
    const result=Buffer.from(res.body.resultImageUrl.split(',')[1],'base64');
    const {data,info}=await sharp(result).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let transparent=0,opaque=0;
    for(let i=3;i<data.length;i+=4){if(data[i]<20)transparent++;if(data[i]>230)opaque++;}
    expect(transparent/(info.width*info.height)).toBeGreaterThan(.1);
    expect(opaque/(info.width*info.height)).toBeGreaterThan(.15);
    expect(data[3]).toBeLessThan(30);
    expect(data[((Math.floor(info.height*.48)*info.width+Math.floor(info.width*.5))*4)+3]).toBeGreaterThan(230);
    mkdirSync('../../artifacts/ai-review',{recursive:true});
    writeFileSync('../../artifacts/ai-review/birefnet-portrait.png',result);
  },90000);

  it('GET /api/background/processes should return process logs', async () => {
    const res = await request(app)
      .get('/api/background/processes')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('4. Presets, Filters & Aspect Ratios', () => {
  it('GET /api/presets should return solid presets, gradients, and filters', async () => {
    const res = await request(app).get('/api/presets');
    expect(res.status).toBe(200);
    expect(res.body.presets.length).toBeGreaterThan(0);
    expect(res.body.filters.length).toBeGreaterThan(0);
    expect(res.body.aspectRatios.length).toBeGreaterThan(0);
  });

  it('POST /api/presets should allow admin to create a new preset', async () => {
    const res = await request(app)
      .post('/api/presets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Neon Glow', type: 'solid', value: '#00FFAA' });
    expect(res.status).toBe(201);
  });
});

describe('5. Memberships & Simulated Transactions', () => {
  it('GET /api/memberships/plans should return plan tiers', async () => {
    const res = await request(app).get('/api/memberships/plans');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3); // Free, Pro, Unlimited
  });

  it('POST /api/memberships/transactions should simulate purchase and create invoice', async () => {
    const res = await request(app)
      .post('/api/memberships/transactions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ tier: 'Pro', amount: 12, simulateStatus: 'Paid' });
    expect(res.status).toBe(201);
    expect(res.body.invoiceNumber).toContain('INV-');
    expect(res.body.status).toBe('Paid');
  });
});

describe('6. Support Tickets & Live Chat', () => {
  it('GET /api/support/tickets should list tickets', async () => {
    const res = await request(app)
      .get('/api/support/tickets')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /api/support/tickets/3825/messages should send reply', async () => {
    const res = await request(app)
      .post('/api/support/tickets/3825/messages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'Terima kasih, tim support kami sedang mengecek.' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Terima kasih, tim support kami sedang mengecek.');
  });
});

describe('7. Admin Overview, Analytics & Audit Logs', () => {
  it('GET /api/admin/overview should return all metric cards with trends', async () => {
    const res = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBeDefined();
    expect(res.body.imagesProcessed).toBeDefined();
    expect(res.body.activeMemberships).toBeDefined();
  });

  it('GET /api/admin/analytics should return charts data', async () => {
    const res = await request(app)
      .get('/api/admin/analytics?range=30d')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.userGrowth.length).toBeGreaterThan(0);
    expect(res.body.imageProcessing.length).toBeGreaterThan(0);
    expect(res.body.exportFormats.length).toBeGreaterThan(0);
    expect(res.body.revenueSimulation.length).toBeGreaterThan(0);
  });

  it('GET /api/admin/audit-logs should contain recorded actions', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('PATCH /api/admin/settings should update system settings', async () => {
    const res = await request(app)
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confidenceThreshold: 0.9 });
    expect(res.status).toBe(200);
  });
});

describe('8. CRUD regression, ownership and account safety', () => {
  it('validates users, opens the exact ID, updates and deletes it', async () => {
    const invalid = await request(app).post('/api/users').set('Authorization', 'Bearer ' + adminToken).send({name:'A',email:'bad',password:'1'});
    expect(invalid.status).toBe(400);
    const created = await request(app).post('/api/users').set('Authorization', 'Bearer ' + adminToken).send({name:'CRUD Regression',email:'crud.regression@pixellift.test',password:'Password123!'});
    expect(created.status).toBe(201);
    const id = created.body.id;
    const detail = await request(app).get('/api/users/' + id).set('Authorization', 'Bearer ' + adminToken);
    expect(detail.body.user.id).toBe(id);
    expect(detail.body.user.password_hash).toBeUndefined();
    const updated = await request(app).patch('/api/users/' + id).set('Authorization', 'Bearer ' + adminToken).send({name:'Updated Regression',membership:'Pro'});
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Updated Regression');
    const deleted = await request(app).delete('/api/users/' + id).set('Authorization','Bearer ' + adminToken);
    expect(deleted.status).toBe(200);
    expect((await request(app).get('/api/users/'+id).set('Authorization','Bearer '+adminToken)).status).toBe(404);
  });

  it('prevents current admin deletion, suspension and role downgrade', async () => {
    const me = await request(app).get('/api/auth/me').set('Authorization','Bearer '+adminToken);
    const id = me.body.id;
    expect((await request(app).delete('/api/users/'+id).set('Authorization','Bearer '+adminToken)).status).toBe(403);
    expect((await request(app).patch('/api/users/'+id).set('Authorization','Bearer '+adminToken).send({role:'User'})).status).toBe(403);
    expect((await request(app).post('/api/users/bulk').set('Authorization','Bearer '+adminToken).send({ids:[id],action:'suspend'})).status).toBe(403);
  });

  it('does not expose another user details to ordinary users', async () => {
    const admin = await request(app).get('/api/auth/me').set('Authorization','Bearer '+adminToken);
    const res = await request(app).get('/api/users/'+admin.body.id).set('Authorization','Bearer '+userToken);
    expect(res.status).toBe(403);
  });

  it('allows owner project updates and rejects updates from another user', async () => {
    const other = await request(app).post('/api/auth/register').send({name:'Another User',email:'ownership@pixellift.test',password:'Password123!'});
    const created = await request(app).post('/api/projects').set('Authorization','Bearer '+userToken).send({name:'Ownership project',originalImageUrl:'data:image/png;base64,abc',status:'Draft'});
    expect(created.status).toBe(201);
    const id=created.body.id;
    expect((await request(app).patch('/api/projects/'+id).set('Authorization','Bearer '+other.body.token).send({name:'Not mine'})).status).toBe(403);
    const updated=await request(app).patch('/api/projects/'+id).set('Authorization','Bearer '+userToken).send({name:'My updated project',status:'Completed'});
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('My updated project');
    expect((await request(app).patch('/api/projects/'+id).set('Authorization','Bearer '+userToken).send({status:'Invalid'})).status).toBe(400);
    expect((await request(app).delete('/api/projects/'+id).set('Authorization','Bearer '+userToken)).status).toBe(200);
  });

  it('requires the current password for sensitive profile updates', async () => {
    const registered = await request(app).post('/api/auth/register').send({name:'Profile User',email:'profile@pixellift.test',password:'Password123!'});
    const token=registered.body.token;
    const denied=await request(app).patch('/api/auth/me').set('Authorization','Bearer '+token).send({name:'Profile User',email:'new.profile@pixellift.test'});
    expect(denied.status).toBe(400);
    const updated=await request(app).patch('/api/auth/me').set('Authorization','Bearer '+token).send({name:'Profile Updated',email:'new.profile@pixellift.test',currentPassword:'Password123!',newPassword:'NewPassword123!'});
    expect(updated.status).toBe(200);
    const login=await request(app).post('/api/auth/login').send({email:'new.profile@pixellift.test',password:'NewPassword123!'});
    expect(login.status).toBe(200);
    expect(login.body.user.name).toBe('Profile Updated');
    const privilege=await request(app).patch('/api/auth/me').set('Authorization','Bearer '+token).send({name:'Profile Updated',email:'new.profile@pixellift.test',role:'Super Admin'});
    expect(privilege.status).toBe(400);
  });

  it('only shows announcements matching the recipient membership and supports update/delete', async () => {
    const registered=await request(app).post('/api/auth/register').send({name:'Free Reader',email:'reader@pixellift.test',password:'Password123!'});
    const token=registered.body.token;
    const created=await request(app).post('/api/admin/notifications').set('Authorization','Bearer '+adminToken).send({title:'Pro only update',content:'New workflow',target:'Pro'});
    expect(created.status).toBe(201);
    const id=created.body.id;
    let list=await request(app).get('/api/auth/notifications').set('Authorization','Bearer '+token);
    expect(list.body.some((n:any)=>n.id===id)).toBe(false);
    expect((await request(app).patch('/api/admin/notifications/'+id).set('Authorization','Bearer '+adminToken).send({title:'Everyone update',content:'New workflow',target:'All'})).status).toBe(200);
    list=await request(app).get('/api/auth/notifications').set('Authorization','Bearer '+token);
    expect(list.body.some((n:any)=>n.id===id)).toBe(true);
    expect((await request(app).delete('/api/admin/notifications/'+id).set('Authorization','Bearer '+adminToken)).status).toBe(200);
    list=await request(app).get('/api/auth/notifications').set('Authorization','Bearer '+token);
    expect(list.body.some((n:any)=>n.id===id)).toBe(false);
  });

  it('supports filter edit/deactivation/deletion without exposing inactive filters publicly', async () => {
    const created=await request(app).post('/api/presets/filters').set('Authorization','Bearer '+adminToken).send({name:'Regression Filter',category:'Custom',settings:{basic:{brightness:10}}});
    expect(created.status).toBe(201);
    const id=created.body.id;
    expect((await request(app).patch('/api/presets/filters/'+id).set('Authorization','Bearer '+adminToken).send({name:'Updated filter',isActive:false})).status).toBe(200);
    const publicList=await request(app).get('/api/presets?all=true');
    expect(publicList.body.filters.some((f:any)=>f.id===id)).toBe(false);
    const adminList=await request(app).get('/api/presets?all=true').set('Authorization','Bearer '+adminToken);
    expect(adminList.body.filters.find((f:any)=>f.id===id).isActive).toBe(false);
    expect((await request(app).delete('/api/presets/filters/'+id).set('Authorization','Bearer '+adminToken)).status).toBe(200);
  });

  it('supports dynamic membership plans retrieval and admin price/quota editing', async () => {
    // 1. Get plans
    const plansRes = await request(app).get('/api/memberships/plans');
    expect(plansRes.status).toBe(200);
    expect(Array.isArray(plansRes.body)).toBe(true);
    expect(plansRes.body.length).toBeGreaterThanOrEqual(3);

    // 2. Non-admin forbidden to modify plan
    const nonAdminPatch = await request(app)
      .patch('/api/memberships/plans/pro')
      .set('Authorization', 'Bearer ' + userToken)
      .send({ price: 99 });
    expect(nonAdminPatch.status).toBe(403);

    // 3. Admin successfully updates Pro tier price and limits
    const adminPatch = await request(app)
      .patch('/api/memberships/plans/pro')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ price: 15, dailyBgRemovalLimit: 300 });
    expect(adminPatch.status).toBe(200);
    expect(adminPatch.body.plan.price).toBe(15);
    expect(adminPatch.body.plan.dailyBgRemovalLimit).toBe(300);

    // 4. Verify public plans reflect updated price
    const updatedPlans = await request(app).get('/api/memberships/plans');
    const proPlan = updatedPlans.body.find((p: any) => p.id === 'pro');
    expect(proPlan.price).toBe(15);
    expect(proPlan.dailyBgRemovalLimit).toBe(300);
  });

  it('supports support ticket creation and replies with screenshot attachment evidence', async () => {
    const fakeAttachment = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    // 1. Create ticket with attachment
    const createRes = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', 'Bearer ' + userToken)
      .send({
        subject: 'Bug dengan screenshot bukti',
        category: 'Bug Report',
        priority: 'High',
        initialMessage: 'Lihat gambar bukti terlampir.',
        attachmentUrl: fakeAttachment,
      });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.id;

    // 2. Fetch ticket details and check message attachment
    const detailsRes = await request(app)
      .get(`/api/support/tickets/${ticketId}`)
      .set('Authorization', 'Bearer ' + userToken);
    expect(detailsRes.status).toBe(200);
    expect(detailsRes.body.messages.length).toBeGreaterThanOrEqual(1);
    expect(detailsRes.body.messages[0].attachmentUrl).toBe(fakeAttachment);

    // 3. Admin replies with screenshot attachment
    const adminReplyAttachment = 'data:image/jpeg;base64,/9j/4AAQSkZJRgAdmin==';
    const replyRes = await request(app)
      .post(`/api/support/tickets/${ticketId}/messages`)
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        message: 'Sudah kami periksa, ini screenshot solusinya.',
        attachmentUrl: adminReplyAttachment,
      });
    expect(replyRes.status).toBe(201);

    // 4. Verify user can see admin reply with attachment
    const finalDetails = await request(app)
      .get(`/api/support/tickets/${ticketId}`)
      .set('Authorization', 'Bearer ' + userToken);
    expect(finalDetails.body.messages.length).toBe(2);
    expect(finalDetails.body.messages[1].attachmentUrl).toBe(adminReplyAttachment);
  });
});

describe('Live project, support and analytics integration',()=>{
 it('syncs editor images and settings to admin, keeps ownership, and does not duplicate saves',async()=>{
  const owner=await request(app).get('/api/auth/me').set('Authorization','Bearer '+userToken);
  const body={id:'proj_sync_regression',name:'Synced studio',originalImageUrl:'data:image/png;base64,AA==',processedImageUrl:'data:image/png;base64,AQ==',thumbnailUrl:'data:image/png;base64,AQ==',maskData:'data:image/png;base64,AQ==',favorite:true,format:'png',width:600,height:800,status:'Draft',settings:{basic:{exposure:15}}};
  const create=await request(app).put('/api/projects/sync/'+body.id).set('Authorization','Bearer '+userToken).send(body);
  expect(create.status).toBe(200);
  const update=await request(app).put('/api/projects/sync/'+body.id).set('Authorization','Bearer '+userToken).send({...body,name:'Renamed studio'});
  expect(update.status).toBe(200);
  const listed=await request(app).get('/api/projects?search=Renamed%20studio').set('Authorization','Bearer '+adminToken);
  expect(listed.body.pagination.total).toBe(1);expect(listed.body.data[0].userId).toBe(owner.body.id);
  expect(listed.body.data[0].maskData).toBe(body.maskData);expect(listed.body.data[0].favorite).toBe(true);
  const other=await request(app).post('/api/auth/register').send({name:'Second owner',email:'second-owner@pixellift.test',password:'Password123!'});
  const denied=await request(app).put('/api/projects/sync/'+body.id).set('Authorization','Bearer '+other.body.token).send(body);expect(denied.status).toBe(403);
  await request(app).delete('/api/projects/'+body.id).set('Authorization','Bearer '+adminToken).expect(200);
  await request(app).get('/api/projects/'+body.id).set('Authorization','Bearer '+userToken).expect(404);
 });
 it('publishes admin FAQ edits and hides inactive knowledge from public access',async()=>{
  const initial=await request(app).get('/api/support/faqs');expect(initial.body.length).toBeGreaterThan(0);
  const f=await request(app).post('/api/support/faqs').set('Authorization','Bearer '+adminToken).send({question:'Test editorial question',answer:'Original answer',category:'Editor'});expect(f.status).toBe(201);
  await request(app).patch('/api/support/faqs/'+f.body.id).set('Authorization','Bearer '+adminToken).send({answer:'Updated answer'}).expect(200);
  const updated=await request(app).get('/api/support/faqs');expect(updated.body.find((x:any)=>x.id===f.body.id).answer).toBe('Updated answer');
  await request(app).patch('/api/support/faqs/'+f.body.id).set('Authorization','Bearer '+adminToken).send({isActive:false}).expect(200);
  expect((await request(app).get('/api/support/faqs?all=true')).body.some((x:any)=>x.id===f.body.id)).toBe(false);
  const bot=await request(app).post('/api/support/chatbot-knowledge').set('Authorization','Bearer '+adminToken).send({keyword:'testkey',title:'Test prompt',response:'Managed answer',isActive:false});expect(bot.status).toBe(201);
  expect((await request(app).get('/api/support/chatbot-knowledge?all=true')).body.some((x:any)=>x.id===bot.body.id)).toBe(false);
  await request(app).delete('/api/support/faqs/'+f.body.id).set('Authorization','Bearer '+adminToken).expect(200);
  await request(app).delete('/api/support/chatbot-knowledge/'+bot.body.id).set('Authorization','Bearer '+adminToken).expect(200);
  await seedDatabase();expect((await request(app).get('/api/support/faqs')).body.some((x:any)=>x.id===f.body.id)).toBe(false);
 });
 it('computes analytics from persisted records and deduplicates export events',async()=>{
  const h={'Authorization':'Bearer '+adminToken};
  const before=(await request(app).get('/api/admin/analytics?range=7d').set(h)).body;
  const body={id:'export-regression',format:'WEBP',width:400,height:600};
  for(let i=0;i<2;i++)await request(app).post('/api/background/exports').send(body).expect(201);
  const after=(await request(app).get('/api/admin/analytics?range=7d').set(h)).body;
  expect(after.userGrowth).toHaveLength(7);
  expect(after.exportFormats.find((x:any)=>x.name==='WEBP').value).toBe(before.exportFormats.find((x:any)=>x.name==='WEBP').value+1);
  const processes=(await request(app).get('/api/background/processes?limit=100').set(h)).body.data;
  const expected=processes.filter((p:any)=>p.createdAt>=after.period.start&&p.createdAt<=after.period.end&&p.status==='Completed').length;
  expect(after.imageProcessing.reduce((n:number,p:any)=>n+p.successful,0)).toBe(expected);
  await request(app).post('/api/background/processes/mock').set(h).send({}).expect(410);
 });
});

describe('Coupon checkout and account ledger',()=>{
 it('uses server prices, records coupon usage, and links manual invoices to real users',async()=>{
  const plans=(await request(app).get('/api/memberships/plans')).body;
  const pro=plans.find((p:any)=>p.name==='Pro');
  const coupon=await request(app).post('/api/coupons').set('Authorization','Bearer '+adminToken).send({code:'VERIFY20',discountPercent:20,maxUses:1,isActive:true});
  expect(coupon.status).toBe(201);
  const checkout=await request(app).post('/api/memberships/transactions').set('Authorization','Bearer '+userToken).send({tier:'Pro',amount:.01,couponCode:'VERIFY20',paymentMethod:'Test simulated payment'});
  expect(checkout.status).toBe(201);expect(checkout.body.amount).toBe(Math.round(pro.price*.8*100)/100);
  await request(app).post('/api/memberships/transactions').set('Authorization','Bearer '+userToken).send({tier:'Pro',amount:.01,couponCode:'VERIFY20'}).expect(400);
  const owner=(await request(app).get('/api/auth/me').set('Authorization','Bearer '+userToken)).body;
  const manual=await request(app).post('/api/memberships/transactions/manual').set('Authorization','Bearer '+adminToken).send({userId:owner.id,userName:'Wrong client name',tier:'Pro',amount:pro.price});
  expect(manual.status).toBe(201);expect(manual.body.userName).toBe(owner.name);
 });
});
