# FinTech Backend System

A comprehensive backend API for financial record management with role-based access control, JWT authentication, and advanced analytics dashboard, designed for the Zorvyn FinTech assignment.

##  Project Overview

This backend system implements a complete financial data processing and access control solution that demonstrates:

- **Role-Based Access Control**: Granular permissions for Admin, Analyst, and Viewer roles
- **Financial Records Management**: Complete CRUD operations for income/expense tracking
- **Dashboard Analytics**: Real-time financial insights with MongoDB aggregation
- **Security**: JWT authentication with secure practices
- **Data Validation**: Comprehensive input validation and error handling

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
Production: https://your-domain.com/api
```

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
- **Basic Access**: Limited view-only permissions
- **Dashboard Access**: Basic dashboard analytics
- **Personal Data**: Can only view own records and summaries
- **Restricted**: No management capabilities

### Access Matrix

| Feature | Admin | Analyst | Viewer |
|----------|--------|---------|--------|
| View Dashboard | ✅ | ✅ | ✅ |
| View All Records | ✅ | ✅ | ❌ |
| View Own Records | ✅ | ✅ | ✅ |
| Create Records | ✅ | ❌ | ❌ |
| Update Records | ✅ | ❌ | ❌ |
| Delete Records | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| System Analytics | ✅ | ✅ | Limited |

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

### Running Tests
```bash
# Test admin user creation
node scripts/create-admin.js

# Test dashboard APIs
node test-dashboard.js

# Test validation and error handling
node test-validation.js
```

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
- **Rate Limiting**: Request throttling (configurable)

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

##  Assignment Compliance

### Zorvyn FinTech Assignment Requirements

This backend system fully addresses all core requirements:

####  1. User and Role Management
- **Creating and managing users**: Complete CRUD operations
- **Assigning roles to users**: Admin can assign admin/analyst/viewer roles
- **Managing user status**: Active/inactive status management
- **Restricting actions based on roles**: Middleware-based role enforcement

####  2. Financial Records Management
- **Required fields implemented**: Amount, Type (income/expense), Category, Date, Notes
- **CRUD operations**: Create, view, update, delete records
- **Filtering capabilities**: By date, category, type, search terms
- **Pagination support**: For large datasets

####  3. Dashboard Summary APIs
- **Total income and expenses**: Aggregated financial summaries
- **Net balance calculation**: Income minus expenses
- **Category-wise totals**: Spending analysis by category
- **Recent activity**: Latest transaction history
- **Monthly/weekly trends**: Time-based financial patterns

#### 4. Access Control Logic
- **Viewer restrictions**: Can only view own records and basic dashboard
- **Analyst permissions**: Can view all records for analysis
- **Admin full access**: Complete system management
- **Role-based middleware**: Enforced at route and data levels

####  5. Validation and Error Handling
- **Input validation**: Comprehensive validation for all endpoints
- **Useful error responses**: Structured error messages with codes
- **Appropriate status codes**: HTTP status codes used correctly
- **Invalid operation protection**: Business logic validation

####  6. Data Persistence
- **MongoDB database**: Professional document database
- **Mongoose ODM**: Schema validation and relationships
- **Indexes**: Performance optimization
- **Data relationships**: User-record associations

### Assumptions Made

1. **Currency**: All amounts are treated as USD (can be extended for multi-currency)
2. **Date Format**: ISO 8601 format for all date operations
3. **User Isolation**: Records are isolated by user ownership with role-based exceptions
4. **Authentication**: JWT-based stateless authentication for scalability
5. **Validation**: Server-side validation is sufficient (no client-side validation assumed)

### Tradeoffs Considered

1. **MongoDB vs Relational Database**:
   - **Chosen**: MongoDB for flexibility with financial data structures
   - **Tradeoff**: Less strict consistency than SQL databases
   - **Justification**: Financial records benefit from document flexibility and schema evolution

2. **JWT vs Session-based Auth**:
   - **Chosen**: JWT for stateless, scalable authentication
   - **Tradeoff**: No server-side session invalidation
   - **Justification**: Better for distributed systems and API-first architecture

3. **Role-based Data Access**:
   - **Chosen**: Data-level filtering by role
   - **Tradeoff**: More complex query logic
   - **Justification**: Essential for meeting assignment access control requirements

4. **Comprehensive Validation**:
   - **Chosen**: Extensive input validation and error handling
   - **Tradeoff**: More code complexity
   - **Justification**: Critical for financial data integrity and security

5. **Aggregation-heavy Dashboard**:
   - **Chosen**: MongoDB aggregation pipelines for analytics
   - **Tradeoff**: Higher database load for complex queries
   - **Justification**: Provides real-time insights without additional analytics layer

### Additional Enhancements

Beyond the core requirements, this implementation includes:

- **Security Features**: Password hashing, JWT refresh tokens, request sanitization
- **Error Handling**: Custom error classes, global error handler, request tracking
- **Performance**: Database indexing, pagination, optimized queries
- **Documentation**: Comprehensive API documentation and setup guides
- **Testing**: Validation tests and role-based access control verification
- **Production Ready**: Environment configuration, Docker support, deployment guides

---

##  Production Readiness Checklist

- [x] **Authentication**: JWT-based auth with secure practices
- [x] **Authorization**: Role-based access control
- [x] **Validation**: Comprehensive input validation
- [x] **Error Handling**: Centralized error management
- [x] **Security**: Data protection and sanitization
- [x] **Documentation**: Complete API documentation
- [x] **Testing**: Test suites for validation
- [x] **Monitoring**: Request tracking and logging
- [x] **Configuration**: Environment-based setup
- [x] **Deployment**: Production-ready configuration

The backend is **production-ready** with comprehensive security, validation, error handling, and documentation, fully compliant with Zorvyn FinTech assignment requirements.
