# FinTech Backend System

A comprehensive backend API for financial record management with role-based access control, JWT authentication, and advanced analytics dashboard.

## Project Overview

This backend system implements a complete financial data processing and access control solution that demonstrates:

- **Role-Based Access Control**: Granular permissions for Admin, Analyst, and Viewer roles
- **Financial Records Management**: Complete CRUD operations for income/expense tracking
- **Dashboard Analytics**: Real-time financial insights with MongoDB aggregation
- **Security**: JWT authentication with secure practices

### Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express-validator
- **Security**: bcryptjs for password hashing
- **Environment**: dotenv for configuration management

##  Quick Start

### Prerequisites

- Node.js 16+ and npm
- MongoDB (local or cloud)
- Git

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd fintech-backend-system/backend
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
# Copy environment template
cp .env.sample .env

# Edit .env with your configuration
nano .env
```

4. **Environment Variables**
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/fintech-backend
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_random
JWT_EXPIRES_IN=24h
```

5. **Database Setup**
```bash
# For local MongoDB
sudo systemctl start mongod

# For MongoDB Atlas (cloud)
# Update MONGODB_URI in .env with your Atlas connection string
```

6. **Create Admin User**
```bash
node scripts/create-admin.js
```

7. **Start Server**
```bash
npm start
```

The server will start at `http://localhost:3000`

##  API Documentation

### Base URL
```
Development: http://localhost:3000/api
Production: https://fintech-backend-system-vq8g.onrender.com/api
```

### Live Demo
🚀 **Live Demo**: [https://fintech-backend-system-vq8g.onrender.com/](https://fintech-backend-system-vq8g.onrender.com/)

### Authentication Required
All endpoints (except login and health check) require JWT authentication:
```http
Authorization: Bearer <your-jwt-token>
```

### API Endpoints

####  Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/login` | User login | Public |
| GET | `/auth/me` | Get current user profile | Authenticated |
| POST | `/auth/refresh` | Refresh JWT token | Authenticated |
| POST | `/auth/logout` | User logout | Authenticated |

####  User Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/users` | Create new user | Admin |
| GET | `/users` | List all users | Admin |
| GET | `/users/:id` | Get specific user | Admin |
| PATCH | `/users/:id` | Update user role/status | Admin |
| DELETE | `/users/:id` | Delete user | Admin |

####  Financial Records
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/records` | Create new record | Admin |
| GET | `/records` | List records with filters | Admin, Analyst |
| GET | `/records/:id` | Get specific record | Admin, Analyst |
| PATCH | `/records/:id` | Update record | Admin |
| DELETE | `/records/:id` | Delete record | Admin |
| GET | `/records/summary/stats` | Get comprehensive statistics | Admin, Analyst |

#### Dashboard Analytics
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/dashboard/summary` | Total income/expense/balance | All Roles |
| GET | `/dashboard/category` | Category-wise statistics | All Roles |
| GET | `/dashboard/trends` | Monthly income vs expense trends | All Roles |
| GET | `/dashboard/recent` | Recent transactions | All Roles |

| GET | `/docs` | API endpoint documentation | Public |

####  Health Check
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/health` | Server health status | Public |

##  Role-Based Access Control

### User Roles

####  Admin
- **Full Access**: All endpoints and operations
- **User Management**: Create, update, delete users
- **Record Management**: Full CRUD on all financial records
- **System Access**: Complete dashboard analytics
- **Data Visibility**: Can view all records in the system

####  Analyst
- **Read Access**: View records and analytics
- **Dashboard Access**: All dashboard endpoints
- **Limited Operations**: Cannot modify data or manage users
- **Data Visibility**: Can view all records for analysis purposes

####  Viewer
- **Dashboard Access**: Can view dashboard data (aggregated system summaries)
- **Basic Access**: Limited view-only permissions
- **Restricted**: No management capabilities
- **Note**: Cannot access individual records, only dashboard analytics

### Access Matrix

| Feature | Admin | Analyst | Viewer |
|----------|--------|---------|--------|
| View Dashboard | ✅ | ✅ | ✅ |
| View All Records | ✅ | ✅ | ❌ |
| Create Records | ✅ | ❌ | ❌ |
| Update Records | ✅ | ❌ | ❌ |
| Delete Records | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| System Analytics | ✅ | ✅ | ✅ |

##  API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data varies by endpoint
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "abc12345",
    "requestedBy": "user@example.com"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "value": "invalid-email"
    }
  ],
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "abc12345",
    "path": "/api/auth/login",
    "method": "POST"
  }
}
```

##  Testing

### Test Scripts
```bash
npm test              # Runs input validation tests (test-validation.js)
npm run test:dashboard # Runs dashboard API tests (test-dashboard.js)
node scripts/verify-api.js  # Full end-to-end API verification
```

### Quick Verification
With the server running, execute:
```bash
node scripts/verify-api.js
```
This script verifies: login, record CRUD, RBAC enforcement, soft delete, and the documentation route.

##  Configuration

### Environment Variables
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port | 3000 | No |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/fintech-backend | Yes |
| NODE_ENV | Environment mode | development | No |
| JWT_SECRET | JWT signing secret | - | Yes |
| JWT_EXPIRES_IN | Token expiry time | 24h | No |

### Database Configuration
- **Indexes**: Optimized queries on commonly accessed fields
- **Validation**: Schema-level data integrity
- **Relationships**: User-record associations with proper isolation

##  Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure, stateless authentication
- **Password Hashing**: bcryptjs with salt rounds
- **Role-Based Access**: Granular permission control
- **Token Expiry**: Configurable session duration

### Data Protection
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: MongoDB ODM protection  
- **XSS Protection**: Input sanitization
- **Rate Limiting**: 100 requests per 15 minutes per IP via `express-rate-limit`
- **Soft Delete**: Records are never permanently removed, ensuring data integrity

### Error Handling
- **Global Error Handler**: Centralized error management
- **Request Tracking**: Unique request IDs for debugging
- **Safe Error Responses**: No sensitive data leakage
- **Comprehensive Logging**: Detailed error tracking

##  Dashboard Analytics

### Available Metrics
- **Financial Summary**: Total income, expenses, net balance
- **Category Analysis**: Spending by category with statistics
- **Trend Analysis**: Monthly income vs expense patterns
- **Recent Activity**: Latest transaction history

### Query Parameters
- **Date Filtering**: `startDate`, `endDate` for time ranges
- **Type Filtering**: `type=income|expense` for transaction types
- **Pagination**: `page`, `limit` for large datasets
- **Category Filtering**: `category` for specific categories

##  Deployment

### Production Setup

1. **Environment Configuration**
```bash
NODE_ENV=production
JWT_SECRET=your_production_secret_here
MONGODB_URI=your_production_mongodb_uri
```

2. **Security Considerations**
- Use strong JWT secrets (32+ characters)
- Enable HTTPS in production
- Configure MongoDB Atlas IP whitelist
- Set up monitoring and logging

3. **Performance Optimization**
- Enable MongoDB indexing
- Configure connection pooling
- Set up CDN for static assets
- Monitor memory usage

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

##  Development

### Project Structure
```
backend/
├── config/          # Database configuration
├── middleware/       # Custom middleware
├── models/          # Mongoose schemas
├── routes/          # API routes
├── scripts/         # Utility scripts
├── .env.sample      # Environment template
├── app.js           # Express app configuration
└── server.js        # Server startup
```

### Adding New Features
1. Create/update models in `models/`
2. Add validation rules in `middleware/validation.js`
3. Implement routes in `routes/`
4. Add tests in appropriate test files
5. Update documentation

##  Monitoring & Debugging

### Request Tracking
Every request includes a unique ID for debugging:
```http
X-Request-ID: abc12345
```

### Error Monitoring
- **Development**: Detailed error responses with stack traces
- **Production**: Safe error responses with logging
- **Request Logging**: Comprehensive request/response tracking

### Health Monitoring
```bash
curl http://localhost:3000/api/health
```

##  Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Update documentation
5. Submit pull request

### Code Standards
- Use ES6+ syntax
- Follow existing naming conventions
- Add input validation for new endpoints
- Include error handling for all operations
- Update API documentation

##  License

This project is licensed under the ISC License.

##  Support

### Common Issues
- **MongoDB Connection**: Check MONGODB_URI in .env
- **Authentication**: Verify JWT_SECRET is set
- **Validation Errors**: Check request body format
- **Permission Denied**: Verify user roles and permissions

### Getting Help
- Check the error response messages for specific guidance
- Review the API documentation above
- Examine the test files for usage examples
- Check server logs for detailed error information

---

## 🚀 Project Status

### ✅ **Implementation Complete**
- **User Management**: Admin, Analyst, Viewer roles with proper permissions
- **Financial Records**: Complete CRUD with filtering and search
- **Dashboard Analytics**: Real-time summaries, trends, and insights
- **Access Control**: Route-level and data-level enforcement
- **Data Persistence**: MongoDB with proper relationships and indexing

### 📊 **Key Features**
- **Authentication**: JWT-based secure authentication
- **Authorization**: Role-based access control
- **Validation**: Comprehensive input validation and error handling
- **API Design**: RESTful endpoints with proper HTTP status codes
- **Database**: MongoDB with optimized queries and indexing
- **Security**: Password hashing, input sanitization, rate limiting
- **Soft Delete**: Records are flagged as deleted, not removed, preserving data history
- **API Docs**: `GET /api/docs` returns a full JSON schema of all endpoints

---

**Status: Production Ready** ✅
**Author**: Pichika Chandu | chandupichika0@gmail.com
