# Firebase Migration Plan for Image-Tagger App

## Current Architecture Analysis
- **Backend**: Express.js + TypeScript + SQLite + Session-based auth
- **Frontend**: React + TypeScript + Vite
- **Features**: Image upload, AI analysis (Gemini), batch processing, user management
- **Storage**: Local file system (uploads/, thumbnails/)
- **Database**: SQLite with complex relational data

## Migration Overview

### Phase 1: Project Setup & Configuration

#### 1. Initialize Firebase Project
```bash
npm install -g firebase-tools
firebase login
firebase init
```
- Select: Hosting, Functions, Firestore, Storage, Authentication
- Choose existing project or create new one

#### 2. Install Firebase Dependencies
```bash
# Backend (Functions)
npm install firebase-admin firebase-functions
npm install --save-dev firebase-functions-test

# Frontend
cd client
npm install firebase
```

#### 3. Project Structure Reorganization
```
image-tagger/
├── functions/              # Firebase Functions (Backend)
│   ├── src/
│   │   ├── index.ts       # Functions entry point
│   │   ├── routes/        # API routes as functions
│   │   ├── services/      # Business logic
│   │   └── middleware/    # Auth middleware
│   └── package.json
├── public/                # Static hosting files
├── client/                # React app (build output goes to public/)
├── firestore.rules        # Database security rules
├── storage.rules          # Storage security rules
└── firebase.json          # Firebase configuration
```

### Phase 2: Database Migration (SQLite → Firestore)

#### 4. Design Firestore Data Structure
```typescript
// Collections structure
users/
├── {userId}/
│   ├── username: string
│   ├── email: string
│   ├── name: string
│   ├── isAdmin: boolean
│   └── createdAt: timestamp

images/
├── {imageId}/
│   ├── userId: string
│   ├── filename: string
│   ├── originalName: string
│   ├── filePath: string
│   ├── thumbnailPath: string
│   ├── fileSize: number
│   ├── status: string
│   └── uploadedAt: timestamp

gemini_analysis/
├── {analysisId}/
│   ├── imageId: string
│   ├── description: string
│   ├── caption: string
│   ├── keywords: array
│   └── analysisDate: timestamp

image_metadata/
├── {metadataId}/
│   ├── imageId: string
│   ├── exifData: object
│   └── extractedAt: timestamp
```

#### 5. Create Data Migration Script
```typescript
// functions/src/migrate-data.ts
import * as admin from 'firebase-admin';
import sqlite3 from 'sqlite3';

export async function migrateFromSQLite() {
  // Read SQLite data and batch write to Firestore
  // Handle users, images, analysis, metadata tables
}
```

### Phase 3: Authentication Migration

#### 6. Replace Session Auth with Firebase Auth
```typescript
// functions/src/middleware/auth.ts
import * as admin from 'firebase-admin';

export const verifyToken = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

#### 7. Update Frontend Authentication
```typescript
// client/src/services/auth.ts
import { auth } from './firebase-config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export const loginUser = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};
```

### Phase 4: File Storage Migration

#### 8. Replace Local Storage with Firebase Storage
```typescript
// functions/src/services/storage.ts
import * as admin from 'firebase-admin';

export const uploadImage = async (file: Buffer, filename: string) => {
  const bucket = admin.storage().bucket();
  const fileRef = bucket.file(`images/${filename}`);
  await fileRef.save(file);
  return await fileRef.getSignedUrl({ action: 'read', expires: '03-01-2500' });
};
```

#### 9. Update Image Processing Pipeline
```typescript
// functions/src/services/image-processor.ts
import * as functions from 'firebase-functions';
import { Storage } from '@google-cloud/storage';

export const processUploadedImage = functions.storage.object().onFinalize(async (object) => {
  // Trigger on file upload
  // Generate thumbnail
  // Extract EXIF data
  // Queue for AI analysis
});
```

### Phase 5: API Migration (Express → Cloud Functions)

#### 10. Convert Express Routes to Cloud Functions
```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as express from 'express';

const app = express();

// Import existing routes
import { imageRoutes } from './routes/imageRoutes';
import { authRoutes } from './routes/authRoutes';

app.use('/api/images', imageRoutes);
app.use('/api/auth', authRoutes);

export const api = functions.https.onRequest(app);
```

#### 11. Update API Endpoints Structure
```typescript
// Individual functions for better performance
export const uploadImage = functions.https.onCall(async (data, context) => {
  // Handle image upload
});

export const getImages = functions.https.onCall(async (data, context) => {
  // Get user images with pagination
});

export const analyzeImage = functions.https.onCall(async (data, context) => {
  // Gemini AI analysis
});
```

### Phase 6: Frontend Migration

#### 12. Update API Client
```typescript
// client/src/services/api.ts
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase-config';

const uploadImage = httpsCallable(functions, 'uploadImage');
const getImages = httpsCallable(functions, 'getImages');

export const imageApi = {
  uploadImage: async (file: File) => {
    const result = await uploadImage({ file });
    return result.data;
  },
  // ... other methods
};
```

#### 13. Update State Management for Real-time Data
```typescript
// client/src/hooks/useImages.ts
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

export const useImages = () => {
  const [user] = useAuthState(auth);
  const [images, setImages] = useState([]);
  
  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'images'),
        where('userId', '==', user.uid)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const imageData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setImages(imageData);
      });
      
      return unsubscribe;
    }
  }, [user]);
  
  return images;
};
```

### Phase 7: Advanced Features Migration

#### 14. Batch Processing with Cloud Functions
```typescript
// functions/src/batch-processor.ts
import * as functions from 'firebase-functions';

export const processBatch = functions.https.onCall(async (data, context) => {
  const { imageIds } = data;
  
  // Process images sequentially as per user preference
  for (const imageId of imageIds) {
    await processImageWithGemini(imageId);
    // Wait between requests to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
});
```

#### 15. Search Implementation with Firestore
```typescript
// functions/src/search.ts
export const searchImages = functions.https.onCall(async (data, context) => {
  const { keyword, userId } = data;
  
  // Use Firestore array-contains for keyword search
  const imagesRef = collection(db, 'images');
  const q = query(
    imagesRef,
    where('userId', '==', userId),
    where('keywords', 'array-contains', keyword)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});
```

### Phase 8: Configuration & Environment

#### 16. Firebase Configuration Files
```json
// firebase.json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

#### 17. Environment Variables Migration
```bash
# Set Firebase Functions config
firebase functions:config:set gemini.api_key="your_gemini_key"
firebase functions:config:set app.session_secret="your_secret"
```

### Phase 9: Security Rules

#### 18. Firestore Security Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /images/{imageId} {
      allow read, write: if request.auth != null &&
        (request.auth.uid == resource.data.userId ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
    }

    match /gemini_analysis/{analysisId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/images/$(resource.data.imageId)).data.userId == request.auth.uid;
    }
  }
}
```

#### 19. Storage Security Rules
```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /images/{userId}/{imageId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /thumbnails/{userId}/{imageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Phase 10: Deployment & Testing

#### 20. Build and Deploy Process
```bash
# Build client
cd client && npm run build
cp -r dist/* ../public/

# Deploy to Firebase
firebase deploy --only functions,hosting,firestore,storage
```

#### 21. Testing Strategy
- Unit tests for Cloud Functions
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Performance testing for image processing pipeline

## Key Considerations & Challenges

### 1. Cost Management
- Monitor Firestore reads/writes (especially for real-time features)
- Optimize Cloud Functions execution time
- Use Firebase Storage lifecycle rules for old files

### 2. Performance Optimization
- Implement pagination for large image collections
- Use Firestore composite indexes for complex queries
- Optimize image processing with Cloud Functions memory allocation

### 3. Data Migration Strategy
- Plan for zero-downtime migration
- Implement data validation during migration
- Keep SQLite as backup during transition period

### 4. Scalability Considerations
- Design for horizontal scaling with Cloud Functions
- Implement proper error handling and retry logic
- Use Firebase Extensions for common functionality

## Migration Checklist

### Pre-Migration
- [ ] Set up Firebase project
- [ ] Install all dependencies
- [ ] Create backup of current SQLite database
- [ ] Test Firebase services in development

### Database Migration
- [ ] Design Firestore collections structure
- [ ] Write and test data migration scripts
- [ ] Migrate user data
- [ ] Migrate image metadata
- [ ] Migrate analysis data
- [ ] Verify data integrity

### Authentication Migration
- [ ] Set up Firebase Authentication
- [ ] Create user accounts in Firebase Auth
- [ ] Update frontend auth logic
- [ ] Update backend auth middleware
- [ ] Test login/logout flows

### Storage Migration
- [ ] Set up Firebase Storage
- [ ] Migrate existing images and thumbnails
- [ ] Update upload logic
- [ ] Update image serving logic
- [ ] Test file operations

### API Migration
- [ ] Convert Express routes to Cloud Functions
- [ ] Update API client in frontend
- [ ] Test all API endpoints
- [ ] Implement error handling
- [ ] Test batch processing

### Security & Rules
- [ ] Implement Firestore security rules
- [ ] Implement Storage security rules
- [ ] Test security rules
- [ ] Set up proper IAM roles

### Deployment
- [ ] Configure Firebase hosting
- [ ] Set up CI/CD pipeline
- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Deploy to production
- [ ] Monitor performance and errors

### Post-Migration
- [ ] Monitor costs and usage
- [ ] Optimize performance bottlenecks
- [ ] Clean up old infrastructure
- [ ] Update documentation
- [ ] Train team on new architecture

## Useful Commands

```bash
# Firebase CLI commands
firebase login
firebase projects:list
firebase use <project-id>
firebase serve --only functions,hosting
firebase deploy
firebase logs --only functions

# Local development
firebase emulators:start
firebase emulators:exec "npm test"

# Configuration
firebase functions:config:get
firebase functions:config:set key=value
firebase functions:config:unset key

# Firestore
firebase firestore:delete --all-collections
firebase firestore:indexes

# Storage
firebase storage:rules:get
firebase storage:rules:deploy
```

## Resources & Documentation

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions for Firebase](https://firebase.google.com/docs/functions)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Storage](https://firebase.google.com/docs/storage)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)

## Notes

- This migration maintains all existing functionality while improving scalability
- Sequential batch processing is preserved as per user preference
- Real-time features can be added with Firestore listeners
- Consider implementing Firebase Extensions for common tasks
- Monitor costs carefully during initial deployment
