import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

async function generateDemoReports() {
  console.log('Generating demo reports...\n');

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

  // Clean existing demo reports
  await prisma.generatedReport.deleteMany({});

  // ═══════════════════════════════════════════════════════════════
  // DAILY REPORT
  // ═══════════════════════════════════════════════════════════════
  const dailyReport = await prisma.generatedReport.create({
    data: {
      type: 'daily',
      periodStart: new Date(yesterday),
      periodEnd: new Date(today),
      content: {
        title: `تقرير العمليات الأمنية اليومي — ${yesterday}`,
        generatedAt: now.toISOString(),
        shift: 'وردية نهارية (06:00 – 18:00)',
        summary: {
          narrative: `وردية متوسطة النشاط مع 14 بلاغ عبر 6 مناطق. منطقتا وسط البلد والمارينا شهدتا أعلى نسبة بلاغات. تم حل جميع البلاغات الحرجة ضمن مؤشر الأداء. تم تسجيل حالة غياب واحدة في منطقة الكفر. معدل إتمام الدوريات 94% أعلى من المستهدف (90%). متوسط وقت الاستجابة 3.2 دقيقة ضمن الحد المقبول (5 دقائق).`,
          recommendations: [
            'زيادة دوريات الليل في منطقة المارينا — شكاوى الضوضاء في تزايد خلال عطلات نهاية الأسبوع',
            'مراجعة نقطة تفتيش 47 في منطقة الكفر — تم تخطيها 3 مرات هذا الأسبوع بسبب مشاكل الوصول',
            'الضابط محمد حسن لديه حالتي غياب متتاليتين — يوصى بمتابعة المشرف',
          ],
        },
        incidents: {
          total: 14,
          resolved: 12,
          pending: 2,
          byPriority: { critical: 1, high: 3, medium: 6, low: 4 },
          byCategory: {
            'تهديد أمني': 1,
            'بنية تحتية': 3,
            'ضوضاء': 4,
            'مرور/مواقف': 2,
            'تعدي': 1,
            'شكوى عامة': 2,
            'حيوانات': 1,
          },
          byZone: {
            'وسط البلد': 4,
            'المارينا': 5,
            'الكفر': 2,
            'جولف غرب': 1,
            'جولف جنوب': 1,
            'المنطقة الصناعية': 1,
          },
        },
        sla: {
          responseCompliance: 96,
          resolutionCompliance: 86,
          avgResponseTime: '3.2 دقيقة',
          avgResolutionTime: '47 دقيقة',
          breaches: [
            { incident: '#A8F2', zone: 'المارينا', type: 'حل', exceededBy: '12 دقيقة' },
            { incident: '#B3C1', zone: 'الكفر', type: 'استجابة', exceededBy: '2 دقيقة' },
          ],
        },
        personnel: {
          totalOnDuty: 42,
          attendance: {
            'في الوقت': 40,
            'متأخر': 1,
            'غياب': 1,
          },
          attendanceRate: 97.6,
          avgCheckInDelta: '+2.3 دقيقة',
        },
        patrols: {
          totalRoutes: 12,
          completed: 11,
          completionRate: 94,
          checkpointsConfirmed: 52,
          checkpointsTotal: 55,
          skipped: [
            { checkpoint: 'نقطة تفتيش الكفر 47', reason: 'البوابة مغلقة — تحتاج صيانة', count: 1 },
            { checkpoint: 'بوابة المنطقة الصناعية 3', reason: 'أعمال بناء تسد الطريق', count: 2 },
          ],
        },
        incidentBrief: [
          { id: '#A8F2', time: '07:15', title: 'مركبة مشبوهة بالقرب من مدخل وسط البلد', zone: 'وسط البلد', category: 'تهديد أمني', priority: 'critical', status: 'resolved', assignedTo: 'أحمد محمود (OFF-003)', responseTime: '2.1 دقيقة', resolutionTime: '18 دقيقة', summary: 'فان أبيض متوقف بالقرب من البوابة الرئيسية بدون تصريح. تم إرسال ضابط، تبين أنه مقاول مسجل لتجديد الفندق. تم تسجيل المركبة والسماح بالمرور.' },
          { id: '#B3C1', time: '08:42', title: 'عطل في موتور البوابة عند نقطة تفتيش الكفر 7', zone: 'الكفر', category: 'بنية تحتية', priority: 'high', status: 'pending', assignedTo: 'عمر خالد (OFF-008)', responseTime: '3.8 دقيقة', resolutionTime: 'معلق — الصيانة مجدولة', summary: 'عطل في موتور البوابة يمنع دخول المركبات. تم التحويل للتشغيل اليدوي. تم إخطار فريق الصيانة.' },
          { id: '#C4D2', time: '09:30', title: 'شكوى ضوضاء — أعمال بناء في المارينا', zone: 'المارينا', category: 'ضوضاء', priority: 'low', status: 'resolved', assignedTo: 'فاطمة حسن (OFF-005)', responseTime: '2.4 دقيقة', resolutionTime: '15 دقيقة', summary: 'أعمال بناء غير مصرح بها في الصباح الباكر. تم تحذير المقاول وإيقاف العمل حتى ساعات التصريح (08:00-18:00).' },
          { id: '#D5E3', time: '10:15', title: 'كلاب ضالة بالقرب من مدخل مدرسة الكفر', zone: 'الكفر', category: 'حيوانات', priority: 'medium', status: 'resolved', assignedTo: 'كريم رضا (OFF-007)', responseTime: '4.2 دقيقة', resolutionTime: '35 دقيقة', summary: 'مجموعة من 3 كلاب ضالة. تم التواصل مع مكافحة الحيوانات ووصلوا خلال 30 دقيقة. تم إزالة الكلاب بأمان.' },
          { id: '#E6F4', time: '11:00', title: 'مواقف غير قانونية تسد طريق المارينا', zone: 'المارينا', category: 'مرور/مواقف', priority: 'medium', status: 'resolved', assignedTo: 'أحمد محمود (OFF-003)', responseTime: '1.8 دقيقة', resolutionTime: '22 دقيقة', summary: 'سيارة سائح متوقفة في طريق الوصول. تم تحديد موقع المالك في المطعم المجاور. تم نقل المركبة وإصدار تحذير.' },
          { id: '#F7A5', time: '12:30', title: 'تسرب مياه بالقرب من ممشى المارينا', zone: 'المارينا', category: 'بنية تحتية', priority: 'high', status: 'resolved', assignedTo: 'فاطمة حسن (OFF-005)', responseTime: '3.1 دقيقة', resolutionTime: '45 دقيقة', summary: 'انفجار أنبوب ري يغمر الممشى. تم تطويق المنطقة. فريق الصيانة أصلح الأنبوب ونظف المنطقة.' },
          { id: '#G8B6', time: '13:45', title: 'محاولة تسلل عند محيط جولف غرب', zone: 'جولف غرب', category: 'تعدي', priority: 'high', status: 'resolved', assignedTo: 'حسن علي (OFF-009)', responseTime: '2.7 دقيقة', resolutionTime: '12 دقيقة', summary: 'شخصان حاولا الدخول من فجوة في سياج المحيط. تم اعتراضهما وفحص هوياتهما — غير مقيمين. تم ترحيلهما. تم الإبلاغ عن الفجوة للإصلاح.' },
          { id: '#H9C7', time: '14:20', title: 'شكوى ساكن — ضوضاء منطقة المسبح', zone: 'وسط البلد', category: 'ضوضاء', priority: 'low', status: 'resolved', assignedTo: 'عمر خالد (OFF-008)', responseTime: '3.5 دقيقة', resolutionTime: '10 دقائق', summary: 'موسيقى حفلة المسبح تتجاوز المستوى المسموح. تم التواصل مع إدارة الفندق وتم خفض الصوت فوراً.' },
          { id: '#I0D8', time: '15:00', title: 'حادث مروري بسيط عند دوار وسط البلد', zone: 'وسط البلد', category: 'حوادث', priority: 'high', status: 'resolved', assignedTo: 'أحمد محمود (OFF-003)', responseTime: '1.5 دقيقة', resolutionTime: '40 دقيقة', summary: 'اصطدام بسيط بين سيارتين، لا إصابات. تم إدارة حركة المرور. تبادل السائقان المعلومات. تم نقل المركبات.' },
          { id: '#J1E9', time: '15:30', title: 'شاحنة توصيل غير مصرح بها في المنطقة السكنية', zone: 'جولف جنوب', category: 'مرور/مواقف', priority: 'low', status: 'resolved', assignedTo: 'كريم رضا (OFF-007)', responseTime: '4.5 دقيقة', resolutionTime: '8 دقائق', summary: 'شاحنة توصيل كبيرة دخلت المنطقة السكنية بدون تصريح. تم توجيهها لمدخل الخدمة.' },
          { id: '#K2F0', time: '16:00', title: 'انقطاع كهرباء في حراسة المنطقة الصناعية', zone: 'المنطقة الصناعية', category: 'بنية تحتية', priority: 'medium', status: 'resolved', assignedTo: 'حسن علي (OFF-009)', responseTime: '3.9 دقيقة', resolutionTime: '25 دقيقة', summary: 'عطل في المولد. تم تشغيل الطاقة الاحتياطية يدوياً. تم استدعاء كهربائي واستعادة التيار الرئيسي.' },
          { id: '#L3G1', time: '16:45', title: 'كلاب ضالة بالقرب من مدرسة الكفر', zone: 'الكفر', category: 'حيوانات', priority: 'medium', status: 'resolved', assignedTo: 'عمر خالد (OFF-008)', responseTime: '3.2 دقيقة', resolutionTime: '28 دقيقة', summary: 'البلاغ الثاني عن كلاب ضالة اليوم في منطقة الكفر. عادت مكافحة الحيوانات لدورية متابعة. تم تأمين المنطقة.' },
          { id: '#M4H2', time: '17:10', title: 'ضوضاء من منطقة المطاعم — المارينا', zone: 'المارينا', category: 'ضوضاء', priority: 'low', status: 'resolved', assignedTo: 'فاطمة حسن (OFF-005)', responseTime: '2.9 دقيقة', resolutionTime: '7 دقائق', summary: 'فحص صوت لحفل مسائي يتجاوز الحدود. تم التواصل مع المدير وتعديل المستويات قبل بدء الحفل.' },
          { id: '#N5I3', time: '17:30', title: 'استفسار عام — ممتلكات مفقودة في وسط البلد', zone: 'وسط البلد', category: 'شكوى عامة', priority: 'low', status: 'resolved', assignedTo: 'أحمد محمود (OFF-003)', responseTime: '2.0 دقيقة', resolutionTime: '5 دقائق', summary: 'سائح أبلغ عن فقدان نظارات شمسية. تم توجيهه لمكتب المفقودات. الغرض كان مسجلاً بالفعل.' },
        ],
        notableEvents: [
          { time: '07:15', description: 'مركبة مشبوهة بالقرب من مدخل وسط البلد — تم إرسال ضابط والتحقق (مقاول مسجل)', priority: 'critical' },
          { time: '14:30', description: 'تسرب مياه بالقرب من ممشى المارينا — تم إخطار فريق الصيانة وتطويق المنطقة', priority: 'high' },
          { time: '16:45', description: 'كلاب ضالة بالقرب من مدرسة الكفر — تم التواصل مع مكافحة الحيوانات', priority: 'medium' },
        ],
      },
      pdfPath: null,
    },
  });
  console.log(`✓ Daily report created: ${dailyReport.id.slice(0,8)}`);

  // ═══════════════════════════════════════════════════════════════
  // WEEKLY REPORT
  // ═══════════════════════════════════════════════════════════════
  const weeklyReport = await prisma.generatedReport.create({
    data: {
      type: 'weekly',
      periodStart: new Date(weekAgo),
      periodEnd: new Date(today),
      content: {
        title: `التقرير الأمني الأسبوعي — ${weekAgo} إلى ${today}`,
        generatedAt: now.toISOString(),
        summary: {
          narrative: `شهد هذا الأسبوع انخفاضاً بنسبة 12% في إجمالي البلاغات مقارنة بالأسبوع الماضي (87 مقابل 99). تظل منطقتا وسط البلد والمارينا الأعلى نشاطاً بنسبة 58% من إجمالي البلاغات. شكاوى الضوضاء زادت 30% في منطقة المارينا مرتبطة بنشاط المطاعم في عطلة نهاية الأسبوع. شكاوى البنية التحتية في منطقة الكفر في تزايد مستمر. تحسن الالتزام بمؤشر الأداء من 82% إلى 89%.`,
          weekOverWeek: {
            incidents: { current: 87, previous: 99, change: -12 },
            responseTime: { current: '3.4 min', previous: '3.8 min', change: -10.5 },
            slaCompliance: { current: 89, previous: 82, change: +8.5 },
            patrolCompletion: { current: 92, previous: 90, change: +2.2 },
          },
          topIssues: [
            'شكاوى الضوضاء في المارينا ترتفع ليالي الخميس-السبت (22:00-02:00)',
            'شكاوى البنية التحتية في الكفر ارتفعت 40% — منطقة نقاط التفتيش 44-48 تحتاج مراجعة صيانة',
            'ثلاثة ضباط لديهم أكثر من حالتي غياب هذا الأسبوع — يوصى بمتابعة الموارد البشرية',
          ],
          topImprovements: [
            'متوسط وقت الاستجابة تحسن من 3.8 إلى 3.4 دقيقة',
            'الالتزام بمؤشر الأداء ارتفع 8.5% — أفضل أسبوع في الشهر الأخير',
            'صفر بلاغات حرجة غير محلولة متجاوزة لمؤشر الأداء هذا الأسبوع',
          ],
        },
        incidents: {
          total: 87,
          resolved: 79,
          pending: 8,
          byPriority: { حرج: 3, عالي: 18, متوسط: 42, منخفض: 24 },
          byDay: {
            'أحد': 11, 'اثنين': 12, 'ثلاثاء': 10, 'أربعاء': 13, 'خميس': 15, 'جمعة': 16, 'سبت': 10,
          },
          byZone: {
            'وسط البلد': 24,
            'المارينا': 27,
            'الكفر': 15,
            'جولف غرب': 9,
            'جولف جنوب': 7,
            'المنطقة الصناعية': 5,
          },
          trends: {
            'شكاوى الضوضاء': { direction: 'up', change: '+30%', zone: 'المارينا' },
            'البنية التحتية': { direction: 'up', change: '+40%', zone: 'الكفر' },
            'التهديدات الأمنية': { direction: 'down', change: '-15%', zone: 'الكل' },
          },
        },
        personnel: {
          avgDailyOnDuty: 43,
          totalNoShows: 5,
          totalCalledOff: 3,
          topPerformers: [
            { name: 'أحمد محمود (OFF-003)', avgResponseTime: '2.1 دقيقة', incidentsHandled: 12 },
            { name: 'فاطمة حسن (OFF-005)', avgResponseTime: '2.4 دقيقة', incidentsHandled: 10 },
            { name: 'عمر خالد (OFF-008)', avgResponseTime: '2.8 دقيقة', incidentsHandled: 9 },
          ],
          flagged: [
            { name: 'محمد حسن (OFF-006)', issue: '3 حالات غياب', recommendation: 'اجتماع مع المشرف' },
          ],
        },
        staffingRecommendations: [
          'نقل 4 ضباط من وردية النهار إلى الليل في منطقة المارينا (الخميس-السبت)',
          'إضافة مسار دورية إضافي في منطقة الكفر يغطي نقاط التفتيش 44-48',
          'النظر في إعادة تعيين مؤقت لـ 2 ضابط من المنطقة الصناعية إلى وسط البلد خلال ساعات الذروة',
        ],
      },
      pdfPath: null,
    },
  });
  console.log(`✓ Weekly report created: ${weeklyReport.id.slice(0,8)}`);

  // ═══════════════════════════════════════════════════════════════
  // MONTHLY MANAGEMENT REPORT (English — for ODH leadership)
  // ═══════════════════════════════════════════════════════════════
  const monthlyReport = await prisma.generatedReport.create({
    data: {
      type: 'monthly',
      periodStart: new Date(monthAgo),
      periodEnd: new Date(today),
      content: {
        title: `Monthly Security Operations Report — El Gouna`,
        subtitle: `Prepared for ODH Operations Management`,
        period: `${monthAgo} to ${today}`,
        generatedAt: now.toISOString(),
        executiveSummary: `El Gouna security operations continued to improve in the reporting period, with an overall SLA compliance rate of 87% (up from 79% the previous month). The Security OS platform has enabled measurable improvements in response times, incident tracking, and personnel accountability across all 6 zones. Average response time to incidents decreased from 4.1 minutes to 3.3 minutes. 347 incidents were tracked and resolved through the system, with a 91% resolution rate. Key challenges remain in the Marina zone (weekend noise complaints) and Kafr zone (aging infrastructure). Recommendations for the coming month include targeted staffing adjustments and a maintenance review for the Kafr area.`,
        kpis: {
          totalIncidents: 347,
          resolvedIncidents: 316,
          resolutionRate: 91,
          avgResponseTime: '3.3 min',
          slaComplianceResponse: 94,
          slaComplianceResolution: 87,
          personnelAttendance: 96.2,
          patrolCompletion: 93,
          residentComplaints: 42,
          whatsappComplaints: 28,
        },
        kpiTrends: {
          avgResponseTime: { previous: '4.1 min', current: '3.3 min', change: '-19.5%', direction: 'improved' },
          slaCompliance: { previous: 79, current: 87, change: '+10.1%', direction: 'improved' },
          personnelAttendance: { previous: 94.1, current: 96.2, change: '+2.2%', direction: 'improved' },
          patrolCompletion: { previous: 89, current: 93, change: '+4.5%', direction: 'improved' },
        },
        zoneAnalysis: [
          { zone: 'Downtown', incidents: 98, avgResponse: '2.9 min', sla: 92, trend: 'stable', notes: 'Highest incident volume but strong response times' },
          { zone: 'Marina', incidents: 104, avgResponse: '3.1 min', sla: 88, trend: 'watch', notes: 'Weekend noise complaints trending up — recommend staffing adjustment' },
          { zone: 'Kafr', incidents: 62, avgResponse: '3.5 min', sla: 85, trend: 'watch', notes: 'Infrastructure complaints increasing — maintenance review needed' },
          { zone: 'West Golf', incidents: 38, avgResponse: '3.4 min', sla: 90, trend: 'stable', notes: 'Low incident area, adequate coverage' },
          { zone: 'South Golf', incidents: 27, avgResponse: '3.8 min', sla: 86, trend: 'stable', notes: 'Response times slightly above average — patrol route adjustment recommended' },
          { zone: 'Industrial', incidents: 18, avgResponse: '4.1 min', sla: 83, trend: 'stable', notes: 'Lowest volume, farthest from HQ — consider dedicated patrol' },
        ],
        categoryBreakdown: [
          { category: 'Infrastructure', count: 72, pct: 20.7, trend: 'up' },
          { category: 'Noise Complaint', count: 68, pct: 19.6, trend: 'up' },
          { category: 'Traffic/Parking', count: 54, pct: 15.6, trend: 'stable' },
          { category: 'General Complaint', count: 48, pct: 13.8, trend: 'stable' },
          { category: 'Security Threat', count: 32, pct: 9.2, trend: 'down' },
          { category: 'Trespassing', count: 28, pct: 8.1, trend: 'stable' },
          { category: 'Accidents', count: 18, pct: 5.2, trend: 'stable' },
          { category: 'Animal Control', count: 15, pct: 4.3, trend: 'stable' },
          { category: 'Fire/Safety', count: 12, pct: 3.5, trend: 'stable' },
        ],
        personnelSummary: {
          totalOfficers: 637,
          avgDailyOnDuty: 298,
          totalShifts: 1842,
          attendance: 96.2,
          noShows: 23,
          calledOff: 14,
          topPerformers: [
            'Ahmed Mahmoud (OFF-003) — avg 2.1 min response, 48 incidents handled',
            'Fatma Hassan (OFF-005) — avg 2.4 min response, 42 incidents handled',
            'Omar Khaled (OFF-008) — avg 2.8 min response, 38 incidents handled',
          ],
        },
        recommendations: [
          {
            priority: 'High',
            action: 'Increase night shift staffing in Marina zone (Thursday-Saturday)',
            rationale: 'Noise complaints spike 300% on weekend nights. Current staffing is insufficient.',
            expectedImpact: 'Reduce noise complaint response time by 40% during peak hours',
          },
          {
            priority: 'High',
            action: 'Commission maintenance review for Kafr zone checkpoints 44-48',
            rationale: 'Infrastructure complaints up 40% in this area. 3 checkpoints have recurring access issues.',
            expectedImpact: 'Reduce infrastructure complaints by 25% and improve patrol completion',
          },
          {
            priority: 'Medium',
            action: 'Add dedicated patrol route for Industrial zone',
            rationale: 'Highest response times (4.1 min avg). Officers are typically responding from adjacent zones.',
            expectedImpact: 'Reduce Industrial zone response time to under 3.5 minutes',
          },
          {
            priority: 'Medium',
            action: 'Implement officer rotation for high-incident zones',
            rationale: 'Top performers are concentrated in Downtown. Rotating skilled officers through Marina and Kafr will improve overall performance.',
            expectedImpact: 'Balance workload and reduce burnout among top performers',
          },
        ],
        aiInsights: [
          'Pattern: Theft-related incidents cluster around checkout periods at hotels (11:00-14:00)',
          'Pattern: Infrastructure complaints correlate with heavy rain events — preventive maintenance recommended before rainy season',
          'Anomaly: Officer response times in South Golf degrading over past 2 weeks — possible patrol route inefficiency',
          'Prediction: Based on seasonal trends, expect 15-20% increase in tourist-related incidents next month',
        ],
      },
      pdfPath: null,
    },
  });
  console.log(`✓ Monthly report created: ${monthlyReport.id.slice(0,8)}`);

  console.log('\n✅ All demo reports generated successfully!');
  console.log('View them at: http://localhost:5173/reports (after login as MGR-001)');

  await prisma.$disconnect();
}

generateDemoReports().catch(console.error);
