import { Activity, Team, User, Workout } from '../models/index.js';

type CreateActivityInput = {
  userId: string;
  teamId: string;
  type: string;
  minutes: number;
};

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Activity input must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Partial<CreateActivityInput>;
  if (
    typeof userId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(userId) ||
    typeof teamId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(teamId) ||
    typeof type !== 'string' ||
    !type.trim() ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    throw Object.assign(new Error('Activity requires valid userId, teamId, type, and positive minutes'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Team input must be an object'), { status: 400 });
  }

  const teamInput = input as Record<string, unknown>;
  const { name, mascot } = teamInput;
  const members = teamInput.members ?? [];
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof mascot !== 'string' ||
    !mascot.trim() ||
    !Array.isArray(members) ||
    !members.every((member): member is string => typeof member === 'string' && /^[a-f\d]{24}$/i.test(member))
  ) {
    throw Object.assign(new Error('Team requires a name, mascot, and valid member IDs'), { status: 400 });
  }

  const existingMembers = await User.find({ _id: { $in: members } }).select('_id').lean();
  if (existingMembers.length !== new Set(members).size) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
  }

  return Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members,
  });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    {
      $project: {
        _id: 0,
        teamName: '$name',
        totalPoints: { $sum: '$activities.points' },
      },
    },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return teams.map((team, index) => ({
    ...team,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail });
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const [recentActivity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).select('type').lean(),
    Workout.find().lean(),
  ]);
  const activityType = recentActivity?.type.trim().toLowerCase();
  const activityFocus = activityType && /run|cycle|bike|cardio|swim|walk/.test(activityType)
    ? 'endurance'
    : activityType && /strength|weight|resistance/.test(activityType)
      ? 'strength'
      : activityType && /yoga|stretch|mobility/.test(activityType)
        ? 'mobility'
        : undefined;
  const focus = activityFocus ?? user.fitnessGoal.trim().toLowerCase();
  const matchingWorkouts = workouts.filter((workout) => workout.focus.trim().toLowerCase() === focus);
  const otherWorkouts = workouts.filter((workout) => workout.focus.trim().toLowerCase() !== focus);
  const reason = activityFocus
    ? `Recommended based on your recent ${recentActivity?.type} activity.`
    : `Recommended to support your ${user.fitnessGoal} fitness goal.`;

  return [
    ...matchingWorkouts.map((workout) => ({ ...workout, reason })),
    ...otherWorkouts.map((workout) => ({
      ...workout,
      reason: `This workout offers a different focus from your current ${focus} recommendation.`,
    })),
  ];
}

export { User };
