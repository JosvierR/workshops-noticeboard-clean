# NoticeBoard C4 architecture

These diagrams describe the deployed NoticeBoard system. PlantUML sources are in `c4/`. The diagrams below render on GitHub.

Production frontend: `https://d1s8syl3tltqh9.cloudfront.net`

CloudFront and S3 serve the SPA. API calls go from the browser to API Gateway. They do not pass through CloudFront.

## System Context

Scope: people and software systems. AWS containers are not shown at this level.

```mermaid
C4Context
title NoticeBoard System Context
Person(user, "Training Manager / User", "Creates, reads, updates, and deletes notices")
Person(dev, "Developer / Maintainer", "Develops and deploys NoticeBoard")
System(noticeboard, "NoticeBoard", "Web application for centrally managing training notices")
System_Ext(github, "GitHub", "Source control and CI/CD automation")
System_Ext(atlas, "MongoDB Atlas", "Managed persistent document database")
System_Ext(cloudwatch, "AWS CloudWatch", "Logs, metrics, and alarms")
Rel(user, noticeboard, "Uses")
Rel(dev, github, "Pushes source")
Rel(github, noticeboard, "Deploys")
Rel(noticeboard, atlas, "Persists notices")
Rel(noticeboard, cloudwatch, "Emits telemetry")
```

The user works in NoticeBoard. The developer works in GitHub. GitHub deploys NoticeBoard. NoticeBoard stores notices in MongoDB Atlas and sends telemetry to CloudWatch.

## Containers

Scope: runtime containers inside NoticeBoard, plus the people who use them.

```mermaid
C4Container
title NoticeBoard Containers
Person(user, "Training Manager / User", "Uses the notice board")
Person(maintainer, "Maintainer", "Reviews operations")
Container_Boundary(noticeboard, "NoticeBoard") {
    Container(spa, "React SPA", "React and Vite", "Browser interface")
    Container(cloudfront, "CloudFront CDN", "Amazon CloudFront", "HTTPS frontend")
    Container(s3, "Private S3", "Amazon S3", "Frontend objects. Public access denied")
    Container(api, "API Gateway", "HTTP API", "JSON REST edge")
    Container(lambda, "Lambda", "Python 3.12", "Notice CRUD")
    ContainerDb(atlas, "MongoDB Atlas", "MongoDB", "noticeboard_db")
    Container(actions, "GitHub Actions", "CI/CD", "Test, build, and deploy")
    Container(cloudwatch, "CloudWatch", "Observability", "Logs, metrics, alarms, dashboard")
}
Rel(user, cloudfront, "Opens the site", "HTTPS")
Rel(cloudfront, s3, "Reads objects", "OAC and SigV4")
Rel(spa, api, "JSON REST", "HTTPS")
Rel(api, lambda, "Invokes", "HTTP API")
Rel(lambda, atlas, "Reads and writes", "MongoDB TLS")
Rel(lambda, cloudwatch, "Logs and metrics")
Rel(api, cloudwatch, "Metrics")
Rel(actions, lambda, "Deploys code")
Rel(actions, s3, "Syncs frontend")
Rel(actions, cloudfront, "Invalidates cache")
Rel(cloudwatch, maintainer, "Dashboard and alarms")
```

Direct public S3 access is denied. CloudFront is the only public path to the frontend objects.

## Frontend components

Scope: the React SPA only.

```mermaid
C4Component
title NoticeBoard Frontend Components
Container_Boundary(spa, "React SPA") {
    Component(app, "App", "App.jsx", "Owns notices, discovery state, overlays, and mutations")
    Component(header, "AppHeader", "AppHeader.jsx", "Navigation, search, commands, and create actions")
    Component(stats, "OverviewStats", "OverviewStats.jsx", "Lightweight operational metrics")
    Component(pulse, "TrainingPulse", "TrainingPulse.jsx", "Prioritized operational feed")
    Component(filters, "NoticeFilters", "NoticeFilters.jsx", "Status and cohort filters")
    Component(composer, "NoticeComposer", "NoticeComposer.jsx", "Create and edit modal or mobile sheet")
    Component(card, "NoticeCard", "NoticeCard.jsx", "Notice content and edit, pin, delete menu")
    Component(commands, "CommandPalette", "CommandPalette.jsx", "Keyboard commands and notice search")
    Component(priority, "Priority Utilities", "src/utils/noticePriority.js", "Derived priority and sorting")
    Component(client, "API Client", "src/api/notices.js", "fetch calls to the configured API")
}
Component_Ext(browser, "Browser Runtime", "Browser", "Hosts the SPA from CloudFront")
Component_Ext(api, "API Gateway", "HTTP API", "Receives JSON REST calls")
Rel(browser, app, "Renders")
Rel(app, header, "Renders")
Rel(app, stats, "Supplies metrics")
Rel(app, pulse, "Supplies prioritized notices")
Rel(app, filters, "Owns filter state")
Rel(app, composer, "Opens and receives form payloads")
Rel(app, commands, "Supplies commands and notices")
Rel(pulse, card, "Renders grouped cards")
Rel(app, priority, "Derives feed state")
Rel(app, client, "Loads and saves notices")
Rel(client, api, "HTTPS JSON")
```

`App` owns the notice list and the local discovery/overlay state. Training Pulse
uses `noticePriority.js` to derive local-calendar states and sort pinned notices
without persisting presentation fields. Components do not call the network
themselves; `src/api/notices.js` remains the only frontend module that calls API
Gateway.

## Backend components

Scope: the Lambda backend only.

```mermaid
C4Component
title NoticeBoard Backend Components
Container_Boundary(lambda, "Lambda backend") {
    Component(handler, "lambda_function.py", "Python", "Dispatches the API Gateway event")
    Component(notices, "app/notices.py", "Python", "Notice CRUD operations")
    Component(validation, "app/validation.py", "Python", "Payload and identifier validation")
    Component(responses, "app/responses.py", "Python", "HTTP response bodies")
    Component(db, "app/db.py", "Python", "MongoDB connection and collection")
}
Component_Ext(pymongo, "PyMongo", "Driver", "MongoDB client")
ComponentDb_Ext(atlas, "MongoDB Atlas", "Database", "notices collection")
Rel(handler, validation, "Validates input")
Rel(handler, notices, "Calls CRUD")
Rel(handler, responses, "Builds the response")
Rel(notices, db, "Reads and writes")
Rel(db, pymongo, "Uses")
Rel(pymongo, atlas, "Queries", "MongoDB TLS")
```

`local_app.py` is a local FastAPI adapter. It is not part of the production Lambda container.

## Deployment

Scope: where each container runs.

```mermaid
C4Deployment
title NoticeBoard Production Deployment
Deployment_Node(device, "End User Device", "Browser") {
    Container(spa, "React SPA runtime", "React and Vite", "Loaded from CloudFront")
}
Deployment_Node(github, "GitHub", "workshops-noticeboard-clean") {
    Deployment_Node(repository, "Repository", "Git") {
        Container(source, "Submission", "challenge/notice-board", "Personal submission folder")
    }
    Deployment_Node(runner, "Actions Runner", "ubuntu-latest") {
        Container(workflow, "NoticeBoard deploy", "GitHub Actions", "tier2-ci-deploy")
    }
}
Deployment_Node(aws, "AWS 279249498881", "us-east-1") {
    Deployment_Node(cfnode, "CloudFront", "E3OKOFJWSNTBPB") {
        Container(cloudfront, "CDN", "CloudFront", "HTTPS and OAC")
    }
    Deployment_Node(s3node, "S3", "private frontend bucket") {
        Container(bucket, "Private bucket", "S3", "Anonymous access denied")
    }
    Deployment_Node(apinode, "API Gateway", "ybemxlautd") {
        Container(api, "HTTP API", "API Gateway", "JSON routes")
    }
    Deployment_Node(lambdanode, "Lambda", "NoticeBoardBackend") {
        Container(function, "Function", "Python 3.12", "lambda_function.lambda_handler")
    }
    Deployment_Node(cwnode, "CloudWatch", "Observability") {
        Container(logs, "Operations", "CloudWatch", "Log group, alarms, dashboard")
    }
}
Deployment_Node(atlasnode, "MongoDB Atlas", "NoticeBoardCluster") {
    ContainerDb(database, "noticeboard_db", "MongoDB", "notices collection")
}
Rel(spa, cloudfront, "Loads assets", "HTTPS")
Rel(cloudfront, bucket, "Reads objects", "OAC SigV4")
Rel(spa, api, "JSON REST", "HTTPS")
Rel(api, function, "Invokes")
Rel(function, database, "Reads and writes", "MongoDB TLS")
Rel(workflow, function, "Updates code", "AWS API")
Rel(workflow, bucket, "Syncs objects", "AWS API")
Rel(workflow, cloudfront, "Invalidates", "AWS API")
Rel(function, logs, "Logs and metrics")
```

## Runtime dynamic — create notice

Scope: one successful `POST /notices`. CloudFront already served the SPA. This request does not go through CloudFront or S3.

```mermaid
sequenceDiagram
    title Create Notice Runtime Flow
    actor User
    participant Form as NoticeForm
    participant App
    participant Client as API Client
    participant API as API Gateway
    participant Handler as lambda_function.py
    participant Validation as validation.py
    participant Notices as notices.py
    participant DB as db.py
    participant Atlas as MongoDB Atlas
    participant CW as CloudWatch
    User->>Form: 1. Submit the form
    Form->>App: 2. Return the payload
    App->>Client: 3. createNotice
    Client->>API: 4. POST /notices over HTTPS
    API->>Handler: 5. Invoke NoticeBoardBackend
    Handler->>Validation: 6. Validate the payload
    Handler->>Notices: 7. Create the notice
    Notices->>DB: 8. Write the document
    DB->>Atlas: 9. Insert over MongoDB TLS
    Handler-->>API: 10. HTTP 201
    API-->>Client: 11. JSON response
    App-->>User: 12. Show the new notice
    Handler->>CW: 13. Emit logs and metrics
```

## CI/CD dynamic — deployment

Scope: one push to `tier2-ci-deploy`.

```mermaid
sequenceDiagram
    title NoticeBoard Deployment Flow
    actor Developer
    participant GitHub
    participant Actions as GitHub Actions
    participant Lambda as NoticeBoardBackend
    participant S3 as Private S3
    participant CF as CloudFront
    participant CW as CloudWatch
    Developer->>GitHub: 1. Push tier2-ci-deploy
    GitHub->>Actions: 2. Start NoticeBoard deploy
    Actions->>Actions: 3. Run backend tests
    Actions->>Actions: 4. Build the frontend
    Actions->>Actions: 5. Scan the production build
    Actions->>Actions: 6. Package Lambda
    Actions->>Actions: 7. Guard account and region
    Actions->>Lambda: 8. Update function code
    Actions->>S3: 9. Sync frontend/dist
    Actions->>CF: 10. Create invalidation
    Actions->>CF: 11. Wait until invalidation completes
    Actions->>Actions: 12. API smoke test
    Actions->>CF: 13. Verify the CloudFront site
    Actions->>S3: 14. Require anonymous index.html 403
    Actions-->>Developer: 15. Workflow success
    Lambda->>CW: Runtime logs and metrics after deployment
```

## Sources

| Diagram | PlantUML |
| --- | --- |
| System Context | `c4/01-system-context.puml` |
| Containers | `c4/02-container.puml` |
| Frontend components | `c4/03-frontend-components.puml` |
| Backend components | `c4/04-backend-components.puml` |
| Deployment | `c4/05-deployment.puml` |
| Create notice | `c4/06-runtime-create-notice.puml` |
| CI/CD | `c4/07-cicd-deployment.puml` |
