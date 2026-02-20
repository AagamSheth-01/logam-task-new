// API endpoint to fix username references in all collections
// This is needed to manually update data when username changes didn't propagate correctly
import { adminDb } from '../../../lib/firebase-admin';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Verify authentication and admin role
    const user = await verifyToken(req);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (user.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { oldUsername, newUsername } = req.body;

    if (!oldUsername || !newUsername) {
      return res.status(400).json({
        success: false,
        message: 'Both oldUsername and newUsername are required'
      });
    }

    console.log(`🔄 Fixing username data: "${oldUsername}" → "${newUsername}"`);

    const results = {
      attendance: 0,
      tasks_assigned: 0,
      tasks_given: 0,
      daily_tasks: 0,
      activity_log: 0
    };

    const tenantId = user.tenantId; // Get tenant from authenticated user

    // Fix attendance records
    const attendanceQuery = tenantId
      ? adminDb.collection('attendance').where('username', '==', oldUsername).where('tenantId', '==', tenantId)
      : adminDb.collection('attendance').where('username', '==', oldUsername);

    const attendanceSnapshot = await attendanceQuery.get();
    const attendancePromises = attendanceSnapshot.docs.map(doc =>
      doc.ref.update({ username: newUsername })
    );
    await Promise.all(attendancePromises);
    results.attendance = attendanceSnapshot.size;
    console.log(`   ✓ Fixed ${results.attendance} attendance records`);

    // Fix task records (assigned_to field)
    const tasksAssignedQuery = tenantId
      ? adminDb.collection('tasks').where('assigned_to', '==', oldUsername).where('tenantId', '==', tenantId)
      : adminDb.collection('tasks').where('assigned_to', '==', oldUsername);

    const tasksAssignedSnapshot = await tasksAssignedQuery.get();
    const tasksAssignedPromises = tasksAssignedSnapshot.docs.map(doc =>
      doc.ref.update({ assigned_to: newUsername })
    );
    await Promise.all(tasksAssignedPromises);
    results.tasks_assigned = tasksAssignedSnapshot.size;
    console.log(`   ✓ Fixed ${results.tasks_assigned} task records (assigned_to)`);

    // Fix task records (given_by field)
    const tasksGivenQuery = tenantId
      ? adminDb.collection('tasks').where('given_by', '==', oldUsername).where('tenantId', '==', tenantId)
      : adminDb.collection('tasks').where('given_by', '==', oldUsername);

    const tasksGivenSnapshot = await tasksGivenQuery.get();
    const tasksGivenPromises = tasksGivenSnapshot.docs.map(doc =>
      doc.ref.update({ given_by: newUsername })
    );
    await Promise.all(tasksGivenPromises);
    results.tasks_given = tasksGivenSnapshot.size;
    console.log(`   ✓ Fixed ${results.tasks_given} task records (given_by)`);

    // Fix daily tasks records (username field)
    const dailyTasksQuery = tenantId
      ? adminDb.collection('dailyTasks').where('username', '==', oldUsername).where('tenantId', '==', tenantId)
      : adminDb.collection('dailyTasks').where('username', '==', oldUsername);

    const dailyTasksSnapshot = await dailyTasksQuery.get();
    const dailyTasksPromises = dailyTasksSnapshot.docs.map(doc =>
      doc.ref.update({ username: newUsername })
    );
    await Promise.all(dailyTasksPromises);
    results.daily_tasks = dailyTasksSnapshot.size;
    console.log(`   ✓ Fixed ${results.daily_tasks} daily task records (username)`);

    // Fix daily tasks records (submittedBy field)
    const dailyTasksSubmittedByQuery = tenantId
      ? adminDb.collection('dailyTasks').where('submittedBy', '==', oldUsername).where('tenantId', '==', tenantId)
      : adminDb.collection('dailyTasks').where('submittedBy', '==', oldUsername);

    const dailyTasksSubmittedBySnapshot = await dailyTasksSubmittedByQuery.get();
    const dailyTasksSubmittedByPromises = dailyTasksSubmittedBySnapshot.docs.map(doc =>
      doc.ref.update({ submittedBy: newUsername })
    );
    await Promise.all(dailyTasksSubmittedByPromises);
    results.daily_tasks_submitted = dailyTasksSubmittedBySnapshot.size;
    console.log(`   ✓ Fixed ${results.daily_tasks_submitted} daily task records (submittedBy)`);

    // Fix activity log records
    const activityQuery = tenantId
      ? adminDb.collection('activity_log').where('userId', '==', oldUsername).where('tenantId', '==', tenantId)
      : adminDb.collection('activity_log').where('userId', '==', oldUsername);

    const activitySnapshot = await activityQuery.get();
    const activityPromises = activitySnapshot.docs.map(doc =>
      doc.ref.update({ userId: newUsername })
    );
    await Promise.all(activityPromises);
    results.activity_log = activitySnapshot.size;
    console.log(`   ✓ Fixed ${results.activity_log} activity log records`);

    console.log(`✅ Username data fix complete`);

    return res.status(200).json({
      success: true,
      message: `Successfully updated all references from "${oldUsername}" to "${newUsername}"`,
      results
    });

  } catch (error) {
    console.error('Error fixing username data:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fix username data'
    });
  }
}
