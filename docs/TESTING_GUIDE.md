# Testing Guide for Programs Page

## How to Test Different Designs and States

### 1. **Modify Mock Data** (`src/services/api/programs.service.ts`)

You can edit the `mockPrograms` array to test different scenarios:

#### Test with More Programs (4+ cards)
```typescript
let mockPrograms: Program[] = [
  // ... existing programs ...
  {
    id: '4',
    programId: 'P0010',
    title: 'Advanced Communication Skills',
    facilitator: 'Jane Smith',
    status: 'active',
    startDate: '2025-11-01',
    endDate: '2026-01-30',
    duration: '90 Days',
    rating: 4.5,
    ratingCount: 5,
    learningEngagement: 85,
    learningEffectiveness: 70,
    cohortSize: 60,
    usersJoined: 55,
    modifiedBy: 'Actifyr',
  },
  // Add more programs here...
];
```

#### Test Different Statuses
```typescript
{
  id: '5',
  programId: 'P0011',
  title: 'Draft Program',
  facilitator: 'Actifyr',
  status: 'draft',  // or 'inactive'
  // ... other fields
}
```

#### Test Programs with No Rating
```typescript
{
  id: '6',
  programId: 'P0012',
  title: 'New Program',
  facilitator: 'Actifyr',
  rating: null,  // No rating yet
  ratingCount: undefined,
  // ... other fields
}
```

#### Test Empty State
```typescript
let mockPrograms: Program[] = [];  // Empty array
```

### 2. **Test Different States**

#### Loading State
- The loading state appears automatically when data is being fetched
- You can increase the delay in `programs.service.ts`:
```typescript
setTimeout(() => {
  resolve({ success: true, data: mockPrograms });
}, 2000);  // 2 second delay
```

#### Error State
- Temporarily modify `getPrograms` to return an error:
```typescript
getPrograms: async (): Promise<ApiResponse<Program[]>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: false,
        data: [],
        error: 'Failed to load programs',
      });
    }, 500);
  });
},
```

#### Empty State
- Set `mockPrograms` to an empty array: `let mockPrograms: Program[] = [];`

#### Search Results
- Type in the search box to filter programs
- Try searching for: "P0007", "Leadership", "Dr. Madana", etc.

### 3. **Test Different Card Variations**

#### Program with High Engagement
```typescript
{
  learningEngagement: 95,
  learningEffectiveness: 90,
  usersJoined: 58,  // Almost full
}
```

#### Program with Low Engagement
```typescript
{
  learningEngagement: 25,
  learningEffectiveness: 15,
  usersJoined: 2,
}
```

#### Program with Large Cohort
```typescript
{
  cohortSize: 100,
  usersJoined: 95,
}
```

### 4. **Test Responsive Design**

- Resize your browser window to test:
  - **Desktop**: 2 columns of cards
  - **Tablet**: 2 columns (smaller)
  - **Mobile**: 1 column

### 5. **Test Banner Visibility**

The page automatically adjusts padding when the trial banner is visible/closed:
- **With Banner**: `padding-top: 90px`
- **Without Banner**: `padding-top: 28px`

You can test this by clicking the "X" button on the trial banner.

### 6. **Quick Testing Tips**

1. **Add More Programs**: Edit `mockPrograms` array in `programs.service.ts`
2. **Change Status**: Set `status: 'inactive'` or `status: 'draft'`
3. **Test Ratings**: Set `rating: null` for no rating, or different values like `4.5`, `3.0`
4. **Test Dates**: Change `startDate` and `endDate` to see different date formats
5. **Test Search**: Use the search box to filter programs
6. **Test Empty**: Clear the `mockPrograms` array temporarily

### 7. **Browser DevTools Testing**

Open browser DevTools (F12) and:
- **Console**: Check for any errors
- **Network Tab**: See API calls (currently mocked)
- **Elements Tab**: Inspect CSS and layout
- **Responsive Mode**: Test different screen sizes

### 8. **Other Design Files Available**

You have these design files that can be implemented:
- `Actifyr_Client_Program_Trial Expired.svg` - Trial expired state
- `Actifyr_Client_Program_Trial Expired (1).svg` - Alternative expired design
- `Actifyr_Client_Program_Trial Expired (2).svg` - Another expired variant
- `Corporate.svg` - Corporate plan design

These can be implemented as separate pages or states.

