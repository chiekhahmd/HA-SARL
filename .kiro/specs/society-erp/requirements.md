# Requirements Document

## Introduction

Society ERP is a web application that enables a small company (initially 2 to 3 users) to manage spending across projects. The system tracks project budgets against actual spend, manages workers (time tracking, absences, and labor cost), records material purchases and their allocation to projects, monitors vehicle insurance periods with renewal alerts, and produces spend roll-up reports per project.

The system is built on a scalable, serverless AWS architecture intended to scale to zero and incur near-zero cost until the company is productive. The backend exposes an HTTP API (AWS Lambda + API Gateway) written in TypeScript/Node.js, persists data in PostgreSQL, and authenticates users through Amazon Cognito with three roles: admin, manager, and worker. The web frontend is a React application hosted on a CDN. Insurance renewal alerts are delivered by email on a scheduled basis. A mobile application is planned for a later phase and is out of scope for this feature, but the API and authentication are designed so the future mobile client can reuse them.

This document defines functional and quality requirements for the first delivery. Mobile-specific requirements are noted as future scope only.

## Glossary

- **System**: The Society ERP application as a whole, including backend API, database, and web frontend.
- **API**: The backend HTTP interface exposed via API Gateway and implemented with AWS Lambda functions in TypeScript/Node.js.
- **Web_App**: The React-based web frontend that consumes the API.
- **Auth_Service**: Amazon Cognito, responsible for user authentication and role assignment.
- **Scheduler**: The scheduled execution component (EventBridge Scheduler + Lambda) that triggers recurring jobs such as insurance renewal checks.
- **Notification_Service**: The component that sends email notifications (Amazon SES).
- **Reporting_Service**: The component that aggregates and rolls up spend data per project.
- **Admin**: A user role with full access, including user management and configuration.
- **Manager**: A user role that manages projects, workers, materials, and vehicles, and views reports.
- **Worker**: A user role that records personal time entries and absences and views assigned project information.
- **User**: Any authenticated person with one of the roles Admin, Manager, or Worker.
- **Project**: A unit of work with a defined budget against which spend is tracked.
- **Budget**: The planned monetary amount allocated to a Project.
- **Actual_Spend**: The sum of labor cost, material cost, and other recorded costs attributed to a Project.
- **Time_Entry**: A record of hours a Worker spent on a Project on a given date.
- **Absence**: A record of a Worker's non-working period (for example vacation or sick leave).
- **Labor_Cost**: The monetary cost computed from a Worker's recorded hours and the Worker's cost rate.
- **Cost_Rate**: The monetary cost per hour associated with a Worker.
- **Material**: A purchasable item recorded with a purchase cost.
- **Material_Allocation**: The assignment of a purchased Material quantity and cost to a Project.
- **Vehicle**: A company car tracked by the System.
- **Insurance_Period**: A vehicle insurance coverage interval defined by a start date and an end date.
- **Renewal_Alert**: An email notification sent before an Insurance_Period end date.
- **Alert_Lead_Time**: The configurable number of days before an Insurance_Period end date at which a Renewal_Alert is sent.

## Requirements

### Requirement 1: User Authentication

**User Story:** As a User, I want to sign in securely, so that I can access the application according to my role.

#### Acceptance Criteria

1. WHEN a User submits valid credentials, THE Auth_Service SHALL authenticate the User and issue an access token.
2. IF a User submits invalid credentials, THEN THE Auth_Service SHALL reject the request and return an authentication error.
3. WHEN a User submits a request to the API without a valid access token, THE API SHALL reject the request with an unauthorized status.
4. WHEN a User's access token has expired, THE API SHALL reject the request with an unauthorized status.
5. THE Auth_Service SHALL assign exactly one role from the set {Admin, Manager, Worker} to each User.

### Requirement 2: Role-Based Authorization

**User Story:** As an Admin, I want access to be controlled by role, so that users can only perform actions appropriate to their responsibilities.

#### Acceptance Criteria

1. WHERE a User has the Admin role, THE API SHALL grant access to user management operations.
2. WHERE a User has the Manager role, THE API SHALL grant access to create, read, update, and delete operations on Projects, Workers, Materials, and Vehicles.
3. WHERE a User has the Worker role, THE API SHALL grant access to create and read operations on the requesting Worker's own Time_Entry and Absence records.
4. IF a User requests an operation that is not permitted for the User's role, THEN THE API SHALL reject the request with a forbidden status.
5. WHERE a User has the Worker role, THE API SHALL deny update and delete operations on Projects, Workers, Materials, and Vehicles.

### Requirement 3: User Management

**User Story:** As an Admin, I want to manage user accounts and roles, so that the right people have the right access.

#### Acceptance Criteria

1. WHEN an Admin submits a new user record with an email address and a role, THE System SHALL create a User account with the specified role.
2. WHEN an Admin updates a User's role to a value in the set {Admin, Manager, Worker}, THE System SHALL persist the updated role.
3. WHEN an Admin deactivates a User account, THE Auth_Service SHALL deny subsequent authentication for that User account.
4. IF an Admin submits a new user record with an email address that already exists, THEN THE System SHALL reject the request and return a conflict error.
5. WHEN an Admin requests the list of User accounts, THE System SHALL return all User accounts with their assigned roles and active status.

### Requirement 4: Project Management

**User Story:** As a Manager, I want to create and maintain projects with budgets, so that I can track spending against plan.

#### Acceptance Criteria

1. WHEN a Manager submits a Project with a name and a Budget, THE System SHALL create the Project with the specified name and Budget.
2. IF a Manager submits a Project with a Budget that is negative, THEN THE System SHALL reject the request and return a validation error.
3. WHEN a Manager updates a Project's name or Budget, THE System SHALL persist the updated values.
4. WHEN a Manager requests a Project, THE System SHALL return the Project's name, Budget, Actual_Spend, and remaining budget.
5. WHEN a Manager requests the list of Projects, THE System SHALL return all Projects with their Budget and Actual_Spend.
6. WHEN a Manager deletes a Project that has no associated Time_Entry, Material_Allocation, or other cost records, THE System SHALL remove the Project.
7. IF a Manager deletes a Project that has associated cost records, THEN THE System SHALL reject the deletion and return a conflict error.

### Requirement 5: Worker Records and Cost Rate

**User Story:** As a Manager, I want to maintain worker records with a cost rate, so that labor cost can be computed for projects.

#### Acceptance Criteria

1. WHEN a Manager submits a Worker with a name and a Cost_Rate, THE System SHALL create the Worker with the specified name and Cost_Rate.
2. IF a Manager submits a Worker with a Cost_Rate that is negative, THEN THE System SHALL reject the request and return a validation error.
3. WHEN a Manager updates a Worker's Cost_Rate, THE System SHALL persist the updated Cost_Rate.
4. WHEN a Manager requests the list of Workers, THE System SHALL return all Workers with their Cost_Rate.
5. WHERE a Time_Entry references a Worker, THE System SHALL compute that Time_Entry's Labor_Cost using the Cost_Rate effective on the Time_Entry date.

### Requirement 6: Time Tracking

**User Story:** As a Worker, I want to record the hours I spend on projects, so that my labor cost is attributed to the correct project.

#### Acceptance Criteria

1. WHEN a Worker submits a Time_Entry with a Project, a date, and a number of hours, THE System SHALL create the Time_Entry associated with the requesting Worker.
2. IF a Worker submits a Time_Entry with a number of hours that is less than zero or greater than 24, THEN THE System SHALL reject the request and return a validation error.
3. IF a Worker submits a Time_Entry referencing a Project that does not exist, THEN THE System SHALL reject the request and return a validation error.
4. WHEN a Worker requests the Worker's own Time_Entry records, THE System SHALL return all Time_Entry records associated with the requesting Worker.
5. WHEN a Manager requests Time_Entry records for a Project, THE System SHALL return all Time_Entry records associated with that Project.
6. WHEN a Time_Entry is created or updated, THE System SHALL compute the Time_Entry's Labor_Cost as the recorded hours multiplied by the Worker's Cost_Rate.

### Requirement 7: Absence Management

**User Story:** As a Worker, I want to record absences, so that non-working periods are tracked accurately.

#### Acceptance Criteria

1. WHEN a Worker submits an Absence with a start date, an end date, and an absence type, THE System SHALL create the Absence associated with the requesting Worker.
2. IF a Worker submits an Absence whose end date is earlier than its start date, THEN THE System SHALL reject the request and return a validation error.
3. IF a Worker submits an Absence whose date range overlaps an existing Absence for the same Worker, THEN THE System SHALL reject the request and return a conflict error.
4. WHEN a Manager requests Absence records for a Worker, THE System SHALL return all Absence records associated with that Worker.
5. WHEN a Worker requests the Worker's own Absence records, THE System SHALL return all Absence records associated with the requesting Worker.

### Requirement 8: Material Purchases

**User Story:** As a Manager, I want to record material purchases, so that material costs are available to allocate to projects.

#### Acceptance Criteria

1. WHEN a Manager submits a Material with a name, a quantity, and a purchase cost, THE System SHALL create the Material record with the specified values.
2. IF a Manager submits a Material with a quantity that is less than or equal to zero, THEN THE System SHALL reject the request and return a validation error.
3. IF a Manager submits a Material with a purchase cost that is negative, THEN THE System SHALL reject the request and return a validation error.
4. WHEN a Manager requests the list of Materials, THE System SHALL return all Material records with their quantity and purchase cost.

### Requirement 9: Material Allocation to Projects

**User Story:** As a Manager, I want to allocate purchased materials to projects, so that material costs contribute to project actual spend.

#### Acceptance Criteria

1. WHEN a Manager submits a Material_Allocation with a Material, a Project, an allocated quantity, and an allocated cost, THE System SHALL create the Material_Allocation associated with the specified Material and Project.
2. IF a Manager submits a Material_Allocation with an allocated quantity that exceeds the Material's unallocated quantity, THEN THE System SHALL reject the request and return a validation error.
3. IF a Manager submits a Material_Allocation with an allocated quantity that is less than or equal to zero, THEN THE System SHALL reject the request and return a validation error.
4. WHEN a Material_Allocation is created, THE System SHALL include the allocated cost in the associated Project's Actual_Spend.
5. WHEN a Manager requests Material_Allocation records for a Project, THE System SHALL return all Material_Allocation records associated with that Project.

### Requirement 10: Vehicle Management

**User Story:** As a Manager, I want to maintain vehicle records, so that company cars can be tracked for insurance.

#### Acceptance Criteria

1. WHEN a Manager submits a Vehicle with an identifier and a description, THE System SHALL create the Vehicle record with the specified values.
2. IF a Manager submits a Vehicle with an identifier that already exists, THEN THE System SHALL reject the request and return a conflict error.
3. WHEN a Manager updates a Vehicle's description, THE System SHALL persist the updated description.
4. WHEN a Manager requests the list of Vehicles, THE System SHALL return all Vehicle records with their identifier and current Insurance_Period.

### Requirement 11: Vehicle Insurance Period Tracking

**User Story:** As a Manager, I want to record insurance periods per vehicle, so that coverage dates are tracked for each car.

#### Acceptance Criteria

1. WHEN a Manager submits an Insurance_Period for a Vehicle with a start date and an end date, THE System SHALL create the Insurance_Period associated with that Vehicle.
2. IF a Manager submits an Insurance_Period whose end date is earlier than its start date, THEN THE System SHALL reject the request and return a validation error.
3. WHEN a Manager requests a Vehicle, THE System SHALL return the Vehicle's Insurance_Period records ordered by start date.
4. WHERE a Vehicle has multiple Insurance_Period records, THE System SHALL identify the Insurance_Period with the latest end date as the current Insurance_Period.

### Requirement 12: Insurance Renewal Alerts

**User Story:** As a Manager, I want to receive email alerts before a vehicle's insurance expires, so that coverage can be renewed on time.

#### Acceptance Criteria

1. THE Scheduler SHALL trigger an insurance renewal check once per calendar day.
2. WHEN the insurance renewal check runs, THE System SHALL identify each Vehicle whose current Insurance_Period end date is within the Alert_Lead_Time from the current date.
3. WHEN a Vehicle's current Insurance_Period end date is within the Alert_Lead_Time, THE Notification_Service SHALL send a Renewal_Alert email identifying the Vehicle and the Insurance_Period end date.
4. THE System SHALL send at most one Renewal_Alert per Vehicle per Insurance_Period.
5. WHERE an Admin configures the Alert_Lead_Time, THE System SHALL use the configured number of days when evaluating Renewal_Alert conditions.
6. IF the Notification_Service fails to send a Renewal_Alert, THEN THE System SHALL record the failure and retry on the next scheduled insurance renewal check.

### Requirement 13: Project Spend Roll-Up Reporting

**User Story:** As a Manager, I want a roll-up of spend per project, so that I can compare actual spend against budget.

#### Acceptance Criteria

1. WHEN a Manager requests a Project spend report, THE Reporting_Service SHALL return the Project's Budget, total Labor_Cost, total material allocated cost, Actual_Spend, and remaining budget.
2. THE Reporting_Service SHALL compute Actual_Spend for a Project as the sum of the Project's total Labor_Cost and total material allocated cost.
3. THE Reporting_Service SHALL compute a Project's remaining budget as the Project's Budget minus the Project's Actual_Spend.
4. WHEN a Manager requests a spend report across all Projects, THE Reporting_Service SHALL return each Project with its Budget and Actual_Spend.
5. WHERE a Project's Actual_Spend exceeds the Project's Budget, THE Reporting_Service SHALL indicate that the Project is over budget.

### Requirement 14: Data Validation and Error Reporting

**User Story:** As a User, I want clear errors when my input is invalid, so that I can correct my submissions.

#### Acceptance Criteria

1. IF a request omits a required field, THEN THE API SHALL reject the request and return a validation error identifying the missing field.
2. IF a request contains a monetary value that is not a number, THEN THE API SHALL reject the request and return a validation error identifying the invalid field.
3. IF a request references an entity that does not exist, THEN THE API SHALL return a not-found error identifying the entity type.
4. WHEN the API returns an error, THE API SHALL include a machine-readable error code and a human-readable message.

### Requirement 15: Serverless Cost and Scaling

**User Story:** As the System owner, I want the system to scale to zero when idle, so that operating cost remains near zero until the company is productive.

#### Acceptance Criteria

1. THE API SHALL be deployed as on-demand serverless functions that incur compute cost only while processing requests.
2. WHILE no requests are being processed, THE API SHALL consume no provisioned compute capacity.
3. THE Scheduler SHALL incur compute cost only during scheduled executions.
4. WHEN request volume increases, THE API SHALL scale the number of concurrent function instances to meet demand.

### Requirement 16: API Reusability for Future Mobile Client

**User Story:** As the System owner, I want the API and authentication to be client-agnostic, so that a future mobile application can reuse them without backend changes.

#### Acceptance Criteria

1. THE API SHALL expose all Project, Worker, Time_Entry, Absence, Material, Material_Allocation, Vehicle, and reporting operations over HTTP without requiring a web-specific client.
2. THE API SHALL accept and return data in a client-agnostic structured format.
3. THE Auth_Service SHALL issue access tokens that authorize API requests independent of the client application.
4. THE API SHALL document each operation's request and response structure.
