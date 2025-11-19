# Progressive Pet Reward System

## Overview

The Steppy app features a progressive pet reward system that encourages users to maintain consistent daily step goals through streak-based pet unlocking. Instead of earning a new pet every day, users must demonstrate sustained commitment by maintaining streaks of goal completion.

## How It Works

### Pet Earning Requirements

The system uses a tiered approach to pet rewards:

1. **First Pet** 🐣
   - **Requirement**: Complete your daily step goal for 1 day
   - **Purpose**: Welcome new users and give them their first companion

2. **Second Pet** 🐦
   - **Requirement**: Maintain a 3-day streak of reaching daily goals
   - **Purpose**: Reward users for building a habit

3. **Third Pet and Beyond** 🦅
   - **Requirement**: Maintain a 7-day streak of reaching daily goals
   - **Purpose**: Reward long-term commitment and consistency

### Streak Calculation

- **Streak Definition**: Consecutive days where the user reaches their daily step goal
- **Goal Achievement**: User must reach 100% of their personalized step goal
- **Reset Conditions**: Missing a day (not reaching the goal) resets the streak to 0
- **Timezone**: All calculations are based on the user's local date

## Technical Implementation

### Database Schema

#### Daily Steps Table
```sql
CREATE TABLE daily_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    step_count INTEGER NOT NULL DEFAULT 0,
    goal_reached BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, date)
);
```

#### Users Pets Table (existing)
```sql
-- Existing table with added position tracking
ALTER TABLE users_pets 
ADD COLUMN position_x REAL DEFAULT 200,
ADD COLUMN position_y REAL DEFAULT 150;
```

### Core Hooks

#### useDailyPetLimit Hook
**Location**: `hooks/useDailyPetLimit.ts`

**Purpose**: Determines if a user can earn a pet based on their current streak and pet count.

**Key Functions**:
- `calculateCurrentStreak()`: Counts consecutive days of goal achievement
- Returns `canEarnPet` boolean and `streakInfo` object

**Logic Flow**:
```typescript
const getRequiredStreak = (petCount: number): number => {
  if (petCount === 0) return 1;  // First pet: 1 day
  if (petCount === 1) return 3;  // Second pet: 3-day streak  
  return 7;                      // Third+ pets: 7-day streak
};
```

#### useStepTracking Hook
**Location**: `hooks/useStepTracking.ts`

**Purpose**: Manages daily step tracking and goal completion.

**Key Functions**:
- `updateStepCount(steps, goal)`: Records daily progress
- `getTodaysSteps()`: Retrieves current day's progress
- Automatically sets `goal_reached` flag when steps ≥ goal

### User Interface Integration

#### Step Challenge Screen (step-02.tsx)
**Purpose**: Main interaction point for the pet reward system.

**Dynamic UI Elements**:

1. **Progress Messages**:
   - Goal incomplete: Shows percentage and step count
   - Goal complete + can earn pet: "Challenge complete! You can earn a pet!"
   - Goal complete + cannot earn pet: "Goal reached! Keep your streak going!"

2. **Streak Information Display**:
   ```typescript
   // When user cannot earn a pet
   <Text>You need a {requiredStreak}-day streak to earn your {petCount === 0 ? 'first' : 'next'} pet!</Text>
   <Text>Current streak: {currentStreak}/{requiredStreak} days</Text>
   
   // When user can earn a pet
   <Text>Great job! You can earn a pet today!</Text>
   <Text>Streak: {currentStreak}/{requiredStreak} days ✅</Text>
   ```

3. **Continue Button Logic**:
   - Only appears when: `showContinueButton && canEarnPet`
   - Requires both goal completion AND streak eligibility

## Pet Positioning System

### Drag and Drop Functionality
**Location**: `components/Pet.tsx`

**Features**:
- Users can drag pets anywhere within defined boundaries
- Positions are automatically saved to the database
- Pets remember their position between app sessions

**Boundaries** (Landscape Mode):
- Top: -40px (allows slight off-screen positioning)
- Bottom: 105px from bottom edge
- Left: -80px (allows slight off-screen positioning)  
- Right: 550px from left edge

**Visual Effects**:
- **During Drag**: Pet z-index increases to 100, overlay decreases to 10
- **At Rest**: Pet z-index at 40, overlay at 50
- **Touch Interaction**: Overlay becomes non-interactive during drag

## User Experience Flow

### New User Journey

1. **Day 1**: User sets up account, completes first daily goal → Earns first pet
2. **Days 2-3**: User works toward 3-day streak for second pet
3. **Day 4**: If streak maintained → Earns second pet
4. **Days 5-11**: User works toward 7-day streak for third pet
5. **Ongoing**: Every 7-day streak earns a new pet

### Streak Recovery

- **Missed Day**: Streak resets to 0, user starts over
- **Motivation**: UI explains exactly what's needed for next pet
- **Transparency**: Current progress is always visible

### Edge Cases Handled

1. **Multiple Goal Completions**: Only one pet per qualifying streak period
2. **Timezone Changes**: Date calculations use local timezone
3. **Database Sync**: Upsert operations prevent duplicate entries
4. **Authentication**: Proper session handling with fallbacks

## Development Notes

### Testing Considerations

- **Date Simulation**: Test streak calculations across multiple days
- **Goal Variations**: Test with different step goals per user
- **Network Issues**: Handle offline scenarios gracefully
- **Performance**: Efficient database queries for streak calculation

### Future Enhancements

- **Streak Bonuses**: Special rewards for long streaks (30, 100 days)
- **Pet Interactions**: Animations based on streak length
- **Social Features**: Share streak achievements
- **Customization**: Different pets for different streak milestones

### Configuration

The system is designed to be easily configurable:
- Streak requirements can be adjusted in `useDailyPetLimit.ts`
- Step goals are user-customizable via profile settings
- Pet unlock progression can be modified without UI changes

## Troubleshooting

### Common Issues

1. **Pet Not Unlocking**: Check streak calculation in database
2. **Wrong Pet Count**: Verify `users_pets` table integrity
3. **Date Mismatches**: Confirm timezone handling in streak calculation
4. **UI Not Updating**: Ensure hooks are properly refreshing data

### Debug Queries

```sql
-- Check user's streak
SELECT date, step_count, goal_reached 
FROM daily_steps 
WHERE user_id = 'user-id' 
ORDER BY date DESC;

-- Check pet count
SELECT COUNT(*) as pet_count 
FROM users_pets 
WHERE user_id = 'user-id';
```

This progressive system creates a more engaging and sustainable motivation structure compared to daily rewards, encouraging users to build lasting healthy habits through consistent goal achievement.















   