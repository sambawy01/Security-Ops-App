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
        title: `Daily Security Operations Report — ${yesterday}`,
        generatedAt: now.toISOString(),
        shift: 'Day Shift (06:00 – 18:00)',
        summary: {
          narrative: `A moderately busy shift with 14 incidents reported across 6 zones. Downtown and Marina zones saw the highest activity. All critical incidents were resolved within SLA. One no-show was recorded in the Kafr zone. Overall patrol completion rate was 94%, above the 90% target. Response times averaged 3.2 minutes, well within the 5-minute SLA threshold.`,
          recommendations: [
            'Increase night patrol frequency in Marina zone — noise complaints trending up on weekends',
            'Review checkpoint 47 in Kafr zone — skipped 3 times this week due to access issues',
            'Officer Mohamed Hassan had 2 consecutive no-shows — recommend supervisor follow-up',
          ],
        },
        incidents: {
          total: 14,
          resolved: 12,
          pending: 2,
          byPriority: { critical: 1, high: 3, medium: 6, low: 4 },
          byCategory: {
            'Security Threat': 1,
            'Infrastructure': 3,
            'Noise Complaint': 4,
            'Traffic/Parking': 2,
            'Trespassing': 1,
            'General Complaint': 2,
            'Animal Control': 1,
          },
          byZone: {
            'Downtown': 4,
            'Marina': 5,
            'Kafr': 2,
            'West Golf': 1,
            'South Golf': 1,
            'Industrial': 1,
          },
        },
        sla: {
          responseCompliance: 96,
          resolutionCompliance: 86,
          avgResponseTime: '3.2 min',
          avgResolutionTime: '47 min',
          breaches: [
            { incident: '#A8F2', zone: 'Marina', type: 'resolution', exceededBy: '12 min' },
            { incident: '#B3C1', zone: 'Kafr', type: 'response', exceededBy: '2 min' },
          ],
        },
        personnel: {
          totalOnDuty: 42,
          attendance: {
            onTime: 40,
            late: 1,
            noShow: 1,
          },
          attendanceRate: 97.6,
          avgCheckInDelta: '+2.3 min',
        },
        patrols: {
          totalRoutes: 12,
          completed: 11,
          completionRate: 94,
          checkpointsConfirmed: 52,
          checkpointsTotal: 55,
          skipped: [
            { checkpoint: 'Kafr Checkpoint 47', reason: 'Gate locked — maintenance access required', count: 1 },
            { checkpoint: 'Industrial Gate 3', reason: 'Construction blocking access', count: 2 },
          ],
        },
        incidentBrief: [
          { id: '#A8F2', time: '07:15', title: 'Suspicious vehicle near Downtown entrance', zone: 'Downtown', category: 'Security Threat', priority: 'critical', status: 'resolved', assignedTo: 'Ahmed Mahmoud (OFF-003)', responseTime: '2.1 min', resolutionTime: '18 min', summary: 'White van parked near main gate without permit. Officer dispatched, verified as registered contractor for hotel renovation. Vehicle logged and cleared.' },
          { id: '#B3C1', time: '08:42', title: 'Broken gate motor at Kafr checkpoint 7', zone: 'Kafr', category: 'Infrastructure', priority: 'high', status: 'pending', assignedTo: 'Omar Khaled (OFF-008)', responseTime: '3.8 min', resolutionTime: 'Pending — maintenance scheduled', summary: 'Gate motor failure preventing vehicle access. Switched to manual operation. Maintenance team notified, ETA tomorrow morning.' },
          { id: '#C4D2', time: '09:30', title: 'Noise complaint — construction at Marina lot', zone: 'Marina', category: 'Noise Complaint', priority: 'low', status: 'resolved', assignedTo: 'Fatma Hassan (OFF-005)', responseTime: '2.4 min', resolutionTime: '15 min', summary: 'Unauthorized early-morning construction. Contractor warned, work paused until permitted hours (08:00-18:00).' },
          { id: '#D5E3', time: '10:15', title: 'Stray dogs near Kafr school entrance', zone: 'Kafr', category: 'Animal Control', priority: 'medium', status: 'resolved', assignedTo: 'Karim Reda (OFF-007)', responseTime: '4.2 min', resolutionTime: '35 min', summary: 'Pack of 3 stray dogs. Animal control contacted and arrived within 30 min. Dogs safely removed from the area.' },
          { id: '#E6F4', time: '11:00', title: 'Illegal parking blocking Marina access road', zone: 'Marina', category: 'Traffic/Parking', priority: 'medium', status: 'resolved', assignedTo: 'Ahmed Mahmoud (OFF-003)', responseTime: '1.8 min', resolutionTime: '22 min', summary: 'Tourist vehicle parked on access road. Owner located at nearby restaurant. Vehicle moved. Warning issued.' },
          { id: '#F7A5', time: '12:30', title: 'Water leak near Marina walkway', zone: 'Marina', category: 'Infrastructure', priority: 'high', status: 'resolved', assignedTo: 'Fatma Hassan (OFF-005)', responseTime: '3.1 min', resolutionTime: '45 min', summary: 'Burst irrigation pipe flooding walkway. Area cordoned off. Maintenance team repaired pipe and cleaned area.' },
          { id: '#G8B6', time: '13:45', title: 'Trespassing attempt at West Golf perimeter', zone: 'West Golf', category: 'Trespassing', priority: 'high', status: 'resolved', assignedTo: 'Hassan Ali (OFF-009)', responseTime: '2.7 min', resolutionTime: '12 min', summary: 'Two individuals attempting to enter through a gap in perimeter fence. Intercepted, IDs checked — non-residents. Escorted off property. Fence gap reported for repair.' },
          { id: '#H9C7', time: '14:20', title: 'Resident complaint — pool area noise', zone: 'Downtown', category: 'Noise Complaint', priority: 'low', status: 'resolved', assignedTo: 'Omar Khaled (OFF-008)', responseTime: '3.5 min', resolutionTime: '10 min', summary: 'Pool party music exceeding permitted levels. Hotel management contacted, volume reduced immediately.' },
          { id: '#I0D8', time: '15:00', title: 'Minor vehicle accident at Downtown roundabout', zone: 'Downtown', category: 'Accidents', priority: 'high', status: 'resolved', assignedTo: 'Ahmed Mahmoud (OFF-003)', responseTime: '1.5 min', resolutionTime: '40 min', summary: 'Two-car fender bender, no injuries. Traffic managed around scene. Both drivers exchanged information. Vehicles moved to shoulder.' },
          { id: '#J1E9', time: '15:30', title: 'Unauthorized delivery truck in residential zone', zone: 'South Golf', category: 'Traffic/Parking', priority: 'low', status: 'resolved', assignedTo: 'Karim Reda (OFF-007)', responseTime: '4.5 min', resolutionTime: '8 min', summary: 'Large delivery truck entered residential area without proper gate pass. Redirected to service entrance.' },
          { id: '#K2F0', time: '16:00', title: 'Power outage at Industrial guardhouse', zone: 'Industrial', category: 'Infrastructure', priority: 'medium', status: 'resolved', assignedTo: 'Hassan Ali (OFF-009)', responseTime: '3.9 min', resolutionTime: '25 min', summary: 'Generator failure at guardhouse. Backup power activated manually. Electrician called, main power restored.' },
          { id: '#L3G1', time: '16:45', title: 'Stray dogs spotted near Kafr school area', zone: 'Kafr', category: 'Animal Control', priority: 'medium', status: 'resolved', assignedTo: 'Omar Khaled (OFF-008)', responseTime: '3.2 min', resolutionTime: '28 min', summary: 'Second report of strays today in Kafr area. Animal control returned for follow-up patrol. Area cleared.' },
          { id: '#M4H2', time: '17:10', title: 'Noise from restaurant area — Marina', zone: 'Marina', category: 'Noise Complaint', priority: 'low', status: 'resolved', assignedTo: 'Fatma Hassan (OFF-005)', responseTime: '2.9 min', resolutionTime: '7 min', summary: 'Sound check for evening event exceeding limits. Manager contacted, levels adjusted before event start.' },
          { id: '#N5I3', time: '17:30', title: 'General inquiry — lost property at Downtown', zone: 'Downtown', category: 'General Complaint', priority: 'low', status: 'resolved', assignedTo: 'Ahmed Mahmoud (OFF-003)', responseTime: '2.0 min', resolutionTime: '5 min', summary: 'Tourist reported lost sunglasses. Directed to Downtown lost-and-found office. Item was already logged there.' },
        ],
        notableEvents: [
          { time: '07:15', description: 'Suspicious vehicle reported near Downtown entrance — officer dispatched, vehicle cleared (resident contractor)', priority: 'critical' },
          { time: '14:30', description: 'Water leak near Marina walkway — maintenance team notified, area cordoned off', priority: 'high' },
          { time: '16:45', description: 'Stray dogs spotted near Kafr school area — animal control contacted', priority: 'medium' },
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
        title: `Weekly Security Operations Report — ${weekAgo} to ${today}`,
        generatedAt: now.toISOString(),
        summary: {
          narrative: `This week saw a 12% decrease in total incidents compared to last week (87 vs 99). Downtown and Marina remain the highest-activity zones, accounting for 58% of all incidents. Noise complaints have increased 30% in Marina zone, correlating with weekend restaurant activity. Infrastructure complaints in Kafr zone continue to trend upward, suggesting aging infrastructure in the area. SLA compliance improved from 82% to 89%.`,
          weekOverWeek: {
            incidents: { current: 87, previous: 99, change: -12 },
            responseTime: { current: '3.4 min', previous: '3.8 min', change: -10.5 },
            slaCompliance: { current: 89, previous: 82, change: +8.5 },
            patrolCompletion: { current: 92, previous: 90, change: +2.2 },
          },
          topIssues: [
            'Marina noise complaints spike Thursday-Saturday nights (22:00-02:00)',
            'Kafr infrastructure complaints up 40% — checkpoint 44-48 area needs maintenance review',
            'Three officers had >2 no-shows this week — HR follow-up recommended',
          ],
          topImprovements: [
            'Average response time improved from 3.8 to 3.4 minutes',
            'SLA compliance up 8.5% — best week in last month',
            'Zero critical incidents unresolved past SLA this week',
          ],
        },
        incidents: {
          total: 87,
          resolved: 79,
          pending: 8,
          byPriority: { critical: 3, high: 18, medium: 42, low: 24 },
          byDay: {
            'Sun': 11, 'Mon': 12, 'Tue': 10, 'Wed': 13, 'Thu': 15, 'Fri': 16, 'Sat': 10,
          },
          byZone: {
            'Downtown': 24,
            'Marina': 27,
            'Kafr': 15,
            'West Golf': 9,
            'South Golf': 7,
            'Industrial': 5,
          },
          trends: {
            noiseComplaints: { direction: 'up', change: '+30%', zone: 'Marina' },
            infrastructure: { direction: 'up', change: '+40%', zone: 'Kafr' },
            securityThreats: { direction: 'down', change: '-15%', zone: 'All' },
          },
        },
        personnel: {
          avgDailyOnDuty: 43,
          totalNoShows: 5,
          totalCalledOff: 3,
          topPerformers: [
            { name: 'Ahmed Mahmoud (OFF-003)', avgResponseTime: '2.1 min', incidentsHandled: 12 },
            { name: 'Fatma Hassan (OFF-005)', avgResponseTime: '2.4 min', incidentsHandled: 10 },
            { name: 'Omar Khaled (OFF-008)', avgResponseTime: '2.8 min', incidentsHandled: 9 },
          ],
          flagged: [
            { name: 'Mohamed Hassan (OFF-006)', issue: '3 no-shows', recommendation: 'Supervisor meeting' },
          ],
        },
        staffingRecommendations: [
          'Move 4 officers from day to night shift in Marina zone (Thursday-Saturday)',
          'Add 1 additional patrol route in Kafr zone covering checkpoints 44-48',
          'Consider temporary reassignment of 2 officers from Industrial to Downtown during peak hours',
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
