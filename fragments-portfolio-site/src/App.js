import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server, Shield, Database, Cloud, GitBranch, Terminal,
  ChevronRight, ExternalLink, Layers, Zap, Lock, HardDrive,
  FileCode, TestTube, Container, ArrowRight, Menu, X,
  Mail, Copy, Check, Globe, Cpu, Box, Code, CheckCircle,
  User, Activity, Award, BookOpen
} from "lucide-react";
import "./App.css";

const NAV = ["About","Architecture","API","Stack","Testing","Pipeline","Contact"];

const FEATURES = [
  {Icon:Shield,color:"#3b82f6",title:"Dual Auth Strategy",desc:"HTTP Basic Auth via Passport.js in development, AWS Cognito JWT in production. Zero code changes between environments — only environment variables differ."},
  {Icon:Lock,color:"#ef4444",title:"Type-Safe Storage",desc:"MIME type is locked at fragment creation. PUT requests update binary content but cannot change the type — preventing broken conversion chains downstream."},
  {Icon:Zap,color:"#22c55e",title:"On-the-Fly Conversion",desc:"Append any supported extension to a GET request (/v1/fragments/:id.html) to convert in real time. Sharp handles image transforms; markdown-it handles Markdown → HTML."},
  {Icon:Container,color:"#8b5cf6",title:"Container-First Design",desc:"Multi-stage Alpine Dockerfile keeps the production image under 150 MB. Runs identically in Docker Compose + LocalStack locally and ECS Fargate in production."},
  {Icon:GitBranch,color:"#eab308",title:"Automated CI/CD",desc:"Every push triggers ESLint, Hadolint, Jest unit tests, and 14 Hurl integration scripts. A v* semver tag automatically builds, pushes to ECR, and rolls out to ECS."},
  {Icon:Box,color:"#06b6d4",title:"Privacy by Design",desc:"Owner IDs are SHA-256 hashes of lowercased email addresses. PII is never stored in plain text in S3, DynamoDB, or application logs."},
];

const ENDPOINTS = [
  {method:"GET",route:"/",desc:"Root health check — returns 200 with API metadata",color:"#22c55e",auth:false},
  {method:"GET",route:"/v1/fragments/health",desc:"Extended health check with environment info",color:"#22c55e",auth:false},
  {method:"GET",route:"/v1/fragments",desc:"List owned fragment IDs. Add ?expand=1 for full metadata objects",color:"#22c55e",auth:true},
  {method:"GET",route:"/v1/fragments/:id",desc:"Retrieve raw fragment binary data with its original Content-Type",color:"#22c55e",auth:true},
  {method:"GET",route:"/v1/fragments/:id/info",desc:"Retrieve fragment metadata as JSON (id, type, size, timestamps)",color:"#22c55e",auth:true},
  {method:"GET",route:"/v1/fragments/:id.:ext",desc:"Retrieve with real-time format conversion (e.g. :id.html, :id.webp)",color:"#22c55e",auth:true},
  {method:"POST",route:"/v1/fragments",desc:"Create a new fragment. Body is stored as-is. Max 5 MB.",color:"#3b82f6",auth:true},
  {method:"PUT",route:"/v1/fragments/:id",desc:"Replace fragment data. Content-Type must match original (immutable).",color:"#eab308",auth:true},
  {method:"DELETE",route:"/v1/fragments/:id",desc:"Permanently delete a fragment and all associated metadata",color:"#ef4444",auth:true},
];

const MIME_TYPES = [
  {type:"text/plain",note:"UTF-8 plain text",converts:[]},
  {type:"text/markdown",note:"CommonMark Markdown",converts:[".html",".txt"]},
  {type:"text/html",note:"Raw HTML markup",converts:[".txt"]},
  {type:"text/csv",note:"Comma-separated values",converts:[".txt",".json"]},
  {type:"application/json",note:"JSON data",converts:[".txt",".yaml"]},
  {type:"image/png",note:"PNG images (Sharp)",converts:[".jpg",".webp",".gif",".avif"]},
  {type:"image/jpeg",note:"JPEG images (Sharp)",converts:[".png",".webp",".gif",".avif"]},
  {type:"image/webp",note:"WebP images (Sharp)",converts:[".png",".jpg",".gif",".avif"]},
  {type:"image/gif",note:"GIF images (Sharp)",converts:[".png",".jpg",".webp",".avif"]},
];

const EXAMPLES = [
  {
    label:"Create a fragment",method:"POST",color:"#3b82f6",
    code:`curl -X POST \\
  http://localhost:8080/v1/fragments \\
  -u user1@email.com:password1 \\
  -H "Content-Type: text/plain" \\
  -d "Hello, Fragments!"`
  },
  {
    label:"List all fragments",method:"GET",color:"#22c55e",
    code:`curl \\
  "http://localhost:8080/v1/fragments?expand=1" \\
  -u user1@email.com:password1`
  },
  {
    label:"Convert Markdown → HTML",method:"GET",color:"#22c55e",
    code:`curl \\
  http://localhost:8080/v1/fragments/<id>.html \\
  -u user1@email.com:password1`
  },
  {
    label:"Update a fragment",method:"PUT",color:"#eab308",
    code:`curl -X PUT \\
  http://localhost:8080/v1/fragments/<id> \\
  -u user1@email.com:password1 \\
  -H "Content-Type: text/plain" \\
  -d "Updated content"`
  },
];

const SAMPLE_RESPONSE = `{
  "status": "ok",
  "fragment": {
    "id": "30a84843-0cd4-4975-95ba-812ebf6c3f15",
    "ownerId": "11d4c22e42c8f61feaba154683dea407",
    "created": "2024-01-15T10:30:00.000Z",
    "updated": "2024-01-15T10:30:00.000Z",
    "type": "text/plain",
    "size": 17
  }
}`;

const ENV_COMPARE = [
  {feature:"Authentication",dev:"HTTP Basic + Passport.js",prod:"AWS Cognito JWT (RS256)"},
  {feature:"Fragment Storage",dev:"In-Memory JavaScript Map",prod:"AWS S3 (versioned bucket)"},
  {feature:"Metadata Store",dev:"In-Memory JavaScript Map",prod:"AWS DynamoDB (on-demand)"},
  {feature:"Configuration",dev:".env.jest / .env file",prod:"ECS Task Definition env vars"},
  {feature:"Container Env",dev:"Docker Compose + LocalStack",prod:"ECS Fargate (VPC)"},
  {feature:"Log Format",dev:"pino-pretty (debug level)",prod:"Structured JSON (info level)"},
];

const DECISIONS = [
  {title:"Type Immutability",desc:"Once a fragment is created with a MIME type, PUT cannot change it. Prevents broken conversion chains and simplifies storage guarantees.",Icon:Lock,color:"#ef4444"},
  {title:"Raw Buffer Storage",desc:"All POST/PUT bodies are parsed as raw Buffer regardless of Content-Type header. Data is stored exactly as received — no encoding transformations.",Icon:Box,color:"#3b82f6"},
  {title:"Graceful Shutdown",desc:"10-second connection drain via stoppable, followed by a 12-second force-kill. Handles SIGINT and SIGTERM for zero-drop deploys.",Icon:Zap,color:"#22c55e"},
  {title:"Owner ID Hashing",desc:"SHA-256 hash of the lowercased email address. PII never appears in S3 keys, DynamoDB partition keys, or application logs.",Icon:Shield,color:"#eab308"},
  {title:"Environment Parity",desc:"A single FRAGMENTS_STORAGE env variable selects the backend — 'memory' for dev, 'aws' for prod. No code branches or conditional imports.",Icon:Globe,color:"#8b5cf6"},
  {title:"Structured Error Responses",desc:"Every error returns { status: 'error', error: { code, message } }. Clients never receive raw Express stack traces.",Icon:Activity,color:"#06b6d4"},
];

const FLOW = [
  {label:"Client",sub:"HTTP Request",color:"#111827",Icon:Globe},
  {label:"Auth Layer",sub:"Cognito / Basic Auth",color:"#3b82f6",Icon:Shield},
  {label:"Express API",sub:"Routes + Middleware",color:"#22c55e",Icon:Server},
  {label:"Storage",sub:"S3 + DynamoDB / Memory",color:"#eab308",Icon:Database},
];

const STACK_DATA = [
  {category:"Runtime & Framework",color:"#22c55e",items:[
    {name:"Node.js 20 LTS",detail:"Alpine Linux base",Icon:Cpu},
    {name:"Express 5.1.0",detail:"REST framework",Icon:Server},
    {name:"Pino",detail:"Structured JSON logging",Icon:Activity},
  ]},
  {category:"Authentication",color:"#3b82f6",items:[
    {name:"AWS Cognito",detail:"JWT (RS256) — production",Icon:Shield},
    {name:"HTTP Basic Auth",detail:"Passport.js — development",Icon:Lock},
    {name:"crypto (Node)",detail:"SHA-256 owner ID hashing",Icon:Award},
  ]},
  {category:"Storage",color:"#eab308",items:[
    {name:"AWS S3",detail:"Binary fragment content",Icon:Cloud},
    {name:"AWS DynamoDB",detail:"Fragment metadata",Icon:Database},
    {name:"In-Memory Map",detail:"MemoryDB for dev/test",Icon:HardDrive},
  ]},
  {category:"Processing",color:"#ef4444",items:[
    {name:"Sharp 0.33",detail:"Image conversion pipeline",Icon:Layers},
    {name:"markdown-it",detail:"Markdown → HTML",Icon:FileCode},
    {name:"js-yaml",detail:"JSON → YAML conversion",Icon:Code},
  ]},
  {category:"Testing",color:"#8b5cf6",items:[
    {name:"Jest + Supertest",detail:"16 unit test files",Icon:TestTube},
    {name:"Hurl",detail:"14 E2E integration scripts",Icon:Terminal},
    {name:"LocalStack",detail:"AWS mock for CI",Icon:Container},
  ]},
  {category:"DevOps & Infrastructure",color:"#06b6d4",items:[
    {name:"Docker (multi-stage)",detail:"Alpine, <150 MB image",Icon:Container},
    {name:"GitHub Actions",detail:"CI + CD pipelines",Icon:GitBranch},
    {name:"AWS ECS Fargate",detail:"Serverless containers",Icon:Globe},
  ]},
];

const TEST_SUITES = [
  {area:"Fragment Model",type:"Unit",badge:"~80 tests · 4 files",color:"#22c55e",
    items:["Constructor & input validation","MIME type allow-listing","Data & metadata CRUD","Conversion format matrix","Size limit (5 MB) enforcement"]},
  {area:"Route Handlers",type:"Unit",badge:"~60 tests · 5 files",color:"#3b82f6",
    items:["GET list with & without ?expand","GET by ID and extension","POST create with validation","PUT update with type check","DELETE + all error paths"]},
  {area:"Auth Middleware",type:"Unit",badge:"~20 tests · 2 files",color:"#8b5cf6",
    items:["Valid credentials → 200","Wrong password → 401","Missing header → 401","Cognito JWT verify mock"]},
  {area:"Health & Response",type:"Unit",badge:"~15 tests · 3 files",color:"#eab308",
    items:["Root / endpoint shape","Health /v1/fragments/health","Structured success response","Structured error response"]},
  {area:"Integration — Hurl",type:"E2E",badge:"14 scripts",color:"#ef4444",
    items:["Auth flows (valid & invalid)","Full CRUD cycle","Content negotiation headers","Markdown & image conversions","4xx error scenarios"]},
  {area:"Linting & Static",type:"Static",badge:"CI enforced",color:"#06b6d4",
    items:["ESLint (no-unused-vars, no-console)","Hadolint Dockerfile checks","Prettier formatting","Dependency audit (npm audit)"]},
];

const CI_STEPS = ["Checkout","Setup Node 20","npm ci","ESLint","Hadolint","Jest (unit)","Build Image","LocalStack","Hurl (E2E)","Push to Hub"];
const CD_STEPS = ["Build Image","Push to ECR","Update Task Def","ECS Rolling Deploy","Health Verify"];

const AWS = [
  {name:"S3",purpose:"Fragment binary content",color:"#22c55e"},
  {name:"DynamoDB",purpose:"Fragment metadata",color:"#3b82f6"},
  {name:"Cognito",purpose:"User authentication",color:"#eab308"},
  {name:"ECR",purpose:"Docker image registry",color:"#ef4444"},
  {name:"ECS Fargate",purpose:"Container orchestration",color:"#8b5cf6"},
  {name:"VPC",purpose:"Network isolation",color:"#06b6d4"},
  {name:"IAM",purpose:"Role-based access control",color:"#f97316"},
];

const DIR = `fragments/
├── src/
│   ├── index.js           # Entry point, graceful shutdown
│   ├── server.js          # HTTP server setup (stoppable)
│   ├── app.js             # Express app, middleware chain
│   ├── logger.js          # Pino logger configuration
│   ├── response.js        # Structured response helpers
│   ├── auth/
│   │   ├── index.js       # Strategy selector
│   │   ├── basic-auth.js  # Passport HTTP Basic
│   │   ├── cognito.js     # AWS Cognito JWT strategy
│   │   └── utils.js       # Token extraction helpers
│   ├── utils/
│   │   └── owner.js       # SHA-256 owner ID hashing
│   ├── model/
│   │   ├── fragment.js    # Core Fragment class + logic
│   │   └── data/
│   │       ├── index.js   # Backend selector
│   │       ├── memory/    # In-memory MemoryDB
│   │       └── aws/       # S3 + DynamoDB backends
│   └── routes/
│       ├── index.js       # Router mount
│       ├── health.js      # GET / and /v1/fragments/health
│       └── api/
│           ├── get.js     # GET list, by-id, by-ext
│           ├── post.js    # POST create
│           ├── put.js     # PUT update
│           └── delete.js  # DELETE
├── tests/
│   ├── unit/              # 16 Jest test files
│   └── integration/       # 14 Hurl scripts
├── .github/workflows/
│   ├── ci.yml             # On push: lint, test, integrate
│   └── cd.yml             # On v* tag: ECR push, ECS deploy
├── Dockerfile             # Multi-stage Alpine build
├── docker-compose.yml     # LocalStack + app stack
└── fragments-definition.json  # ECS task definition`;

function Header({title,subtitle}){
  return(
    <motion.div className="section-header" initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}>
      <h2>{title}</h2>
      {subtitle&&<p>{subtitle}</p>}
    </motion.div>
  );
}

function App(){
  const[menu,setMenu]=useState(false);
  const[copied,setCopied]=useState(null);
  const[active,setActive]=useState("About");
  const[activeExample,setActiveExample]=useState(0);

  const copy=(text,i)=>{
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(()=>setCopied(null),2000);
  };

  const go=(id)=>{
    document.getElementById(id.toLowerCase())?.scrollIntoView({behavior:"smooth"});
    setActive(id);
    setMenu(false);
  };

  return(
    <div className="app">

      <nav className="navbar">
        <div className="nav-inner">
          <div className="nav-logo" onClick={()=>go("About")}>
            <div className="logo-icon"><Server size={20}/></div>
            <span>Fragments</span>
            <span className="version-badge">v0.11.0</span>
          </div>
          <div className="nav-links-desktop">
            {NAV.map(n=>(
              <button key={n} className={"nav-link"+(active===n?" active":"")} onClick={()=>go(n)}>{n}</button>
            ))}
            <a href="https://github.com/djpatel63/fragments" target="_blank" rel="noreferrer" className="nav-github"><GitBranch size={18}/></a>
          </div>
          <button className="mobile-toggle" onClick={()=>setMenu(!menu)}>
            {menu?<X size={22}/>:<Menu size={22}/>}
          </button>
        </div>
        <AnimatePresence>
          {menu&&(
            <motion.div className="mobile-menu" initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}>
              {NAV.map(n=><button key={n} className="mobile-link" onClick={()=>go(n)}>{n}</button>)}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── HERO ─── */}
      <section id="about" className="hero">
        <motion.div className="hero-content" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:0.6}}>
          <div className="hero-badge">Cloud-Native Microservice · REST API</div>
          <h1>Fragments API</h1>
          <p className="hero-sub">
            A production-grade REST microservice for storing, retrieving, and converting text and image fragments.
            Built with Node.js + Express, deployed to AWS ECS Fargate with a full GitHub Actions CI/CD pipeline.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={()=>go("Architecture")}>Explore Architecture <ChevronRight size={16}/></button>
            <button className="btn-secondary" onClick={()=>go("API")}>View API Docs <ExternalLink size={14}/></button>
          </div>
          <div className="hero-stats">
            {[["9","Endpoints"],["30+","Test Files"],["7","AWS Services"],["2","Auth Modes"],["9","MIME Types"],["2","Environments"]].map(([num,label])=>(
              <div className="stat" key={label}><span className="stat-num">{num}</span><span className="stat-label">{label}</span></div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── ABOUT ─── */}
      <section className="section">
        <div className="section-inner">
          <Header title="About the Project" subtitle="A capstone microservice built to production standards"/>
          <div className="about-grid">
            <motion.div className="about-text" initial={{opacity:0,x:-20}} whileInView={{opacity:1,x:0}} viewport={{once:true}}>
              <div className="about-card">
                <div className="about-card-icon"><User size={20}/></div>
                <h3>What Was Built</h3>
                <p>
                  Fragments is a cloud-native REST API microservice developed for a Cloud Computing &amp; Architecture course.
                  The service allows authenticated users to store arbitrary text and image content as "fragments",
                  retrieve them later, and convert between supported formats on demand.
                </p>
                <p>
                  The project was designed to demonstrate real-world engineering practices:
                  environment parity between dev and prod, infrastructure-as-code, automated testing at multiple levels,
                  and containerized deployments.
                </p>
              </div>
              <div className="about-card">
                <div className="about-card-icon"><BookOpen size={20}/></div>
                <h3>Engineering Goals</h3>
                <ul className="about-list">
                  <li><CheckCircle size={15} className="list-check"/>Design a stateless REST API following HTTP semantics strictly</li>
                  <li><CheckCircle size={15} className="list-check"/>Swap storage backends (memory ↔ AWS) with zero code changes</li>
                  <li><CheckCircle size={15} className="list-check"/>Achieve full CI with lint, unit tests, and E2E integration on every push</li>
                  <li><CheckCircle size={15} className="list-check"/>Automate ECS deployment on every versioned release tag</li>
                  <li><CheckCircle size={15} className="list-check"/>Never expose PII in storage keys, logs, or responses</li>
                </ul>
              </div>
            </motion.div>
            <motion.div className="features-col" initial={{opacity:0,x:20}} whileInView={{opacity:1,x:0}} viewport={{once:true}}>
              <div className="features-grid">
                {FEATURES.map((f,i)=>(
                  <motion.div key={f.title} className="feature-card" initial={{opacity:0,y:15}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.06}}>
                    <div className="feature-icon" style={{background:f.color+"14",color:f.color}}><f.Icon size={18}/></div>
                    <h4>{f.title}</h4>
                    <p>{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── ARCHITECTURE ─── */}
      <section id="architecture" className="section section-alt">
        <div className="section-inner">
          <Header title="Architecture" subtitle="Dual-environment design — one codebase, zero code changes between dev and prod"/>

          <div className="arch-flow">
            <div className="flow-row">
              {FLOW.map((f,i)=>(
                <React.Fragment key={f.label}>
                  <motion.div className="flow-card" initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.1}}>
                    <div className="flow-icon" style={{background:f.color+"14",color:f.color}}><f.Icon size={20}/></div>
                    <div className="flow-label">{f.label}</div>
                    <div className="flow-sub">{f.sub}</div>
                  </motion.div>
                  {i<3&&<ArrowRight size={20} className="flow-arrow"/>}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="env-compare-section">
            <h3>Dev vs Production Environment</h3>
            <p className="env-sub">The same Docker image runs in both environments. A single environment variable switches the backend.</p>
            <div className="env-table-wrap">
              <table className="env-table">
                <thead>
                  <tr>
                    <th>Concern</th>
                    <th><span className="env-tag dev">Development</span></th>
                    <th><span className="env-tag prod">Production</span></th>
                  </tr>
                </thead>
                <tbody>
                  {ENV_COMPARE.map(r=>(
                    <tr key={r.feature}>
                      <td className="env-feature">{r.feature}</td>
                      <td className="env-dev">{r.dev}</td>
                      <td className="env-prod">{r.prod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="decisions-grid">
            {DECISIONS.map((d,i)=>(
              <motion.div key={d.title} className="decision-card" initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.07}}>
                <div className="decision-icon" style={{background:d.color+"14",color:d.color}}><d.Icon size={18}/></div>
                <h4>{d.title}</h4>
                <p>{d.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="dir-structure">
            <h3>Project Structure</h3>
            <pre>{DIR}</pre>
          </div>
        </div>
      </section>

      {/* ─── API ─── */}
      <section id="api" className="section">
        <div className="section-inner">
          <Header title="API Reference" subtitle="RESTful interface — all /v1/fragments routes require authentication"/>

          <div className="endpoints-list">
            {ENDPOINTS.map((ep,i)=>(
              <motion.div key={i} className="endpoint-row" initial={{opacity:0,x:-10}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:i*0.04}}>
                <span className="method-badge" style={{background:ep.color+"15",color:ep.color,borderColor:ep.color+"30"}}>{ep.method}</span>
                <code className="route-code">{ep.route}</code>
                <span className="endpoint-desc">{ep.desc}</span>
                <span className={"auth-tag"+(ep.auth?"":" auth-public")}>{ep.auth?"🔒 Auth":"Public"}</span>
                <button className="copy-btn" onClick={()=>copy(ep.method+" "+ep.route,i)}>
                  {copied===i?<Check size={14}/>:<Copy size={14}/>}
                </button>
              </motion.div>
            ))}
          </div>

          <div className="api-examples-section">
            <h3>Request Examples</h3>
            <div className="example-layout">
              <div className="example-tabs">
                {EXAMPLES.map((ex,i)=>(
                  <button key={i} className={"example-tab"+(activeExample===i?" active":"")} onClick={()=>setActiveExample(i)}>
                    <span className="example-tab-method" style={{color:ex.color}}>{ex.method}</span>
                    {ex.label}
                  </button>
                ))}
              </div>
              <div className="example-code-wrap">
                <div className="code-block">
                  <div className="code-header">
                    <span>Terminal</span>
                    <button className="copy-btn" onClick={()=>copy(EXAMPLES[activeExample].code,"ex")}>
                      {copied==="ex"?<Check size={13}/>:<Copy size={13}/>}
                    </button>
                  </div>
                  <pre>{EXAMPLES[activeExample].code}</pre>
                </div>
                <div className="response-block">
                  <div className="code-header"><span>Response</span></div>
                  <pre>{SAMPLE_RESPONSE}</pre>
                </div>
              </div>
            </div>
          </div>

          <div className="mime-section">
            <h3>Supported MIME Types</h3>
            <p className="conv-sub">9 content types accepted — each may support additional format conversions via extension</p>
            <div className="mime-grid">
              {MIME_TYPES.map((m,i)=>(
                <motion.div key={i} className="mime-card" initial={{opacity:0,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.05}}>
                  <code className="mime-type">{m.type}</code>
                  <span className="mime-note">{m.note}</span>
                  {m.converts.length>0&&(
                    <div className="mime-converts">
                      <span className="converts-label">→</span>
                      {m.converts.map(c=><span key={c} className="conv-tag">{c}</span>)}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── STACK ─── */}
      <section id="stack" className="section section-alt">
        <div className="section-inner">
          <Header title="Tech Stack" subtitle="Production-grade tooling across every layer of the system"/>
          <div className="stack-grid">
            {STACK_DATA.map((cat,ci)=>(
              <motion.div key={cat.category} className="stack-category" initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:ci*0.08}}>
                <div className="stack-cat-header">
                  <div className="stack-dot" style={{background:cat.color}}></div>
                  <h4>{cat.category}</h4>
                </div>
                {cat.items.map((item,ii)=>(
                  <div key={ii} className="stack-item">
                    <div className="stack-item-icon" style={{color:cat.color}}><item.Icon size={16}/></div>
                    <div>
                      <div className="stack-item-name">{item.name}</div>
                      <div className="stack-item-detail">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTING ─── */}
      <section id="testing" className="section">
        <div className="section-inner">
          <Header title="Testing Strategy" subtitle="Unit, integration, and static analysis — automated on every push"/>
          <div className="test-stats-row">
            {[["16","Unit test files"],["14","Hurl E2E scripts"],["30+","Total test files"],["100%","CI enforced"]].map(([n,l])=>(
              <div className="test-stat" key={l}>
                <span className="test-stat-num">{n}</span>
                <span className="test-stat-label">{l}</span>
              </div>
            ))}
          </div>
          <div className="test-grid">
            {TEST_SUITES.map((s,i)=>(
              <motion.div key={s.area} className="test-suite-card" initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08}}>
                <div className="test-suite-header">
                  <div className="test-suite-icon" style={{background:s.color+"14",color:s.color}}><TestTube size={16}/></div>
                  <div>
                    <h4>{s.area}</h4>
                    <div className="test-badges">
                      <span className="test-type-badge">{s.type}</span>
                      <span className="test-count-badge" style={{color:s.color,background:s.color+"12",borderColor:s.color+"25"}}>{s.badge}</span>
                    </div>
                  </div>
                </div>
                <ul className="test-items">
                  {s.items.map(it=>(
                    <li key={it}><Check size={13} style={{color:s.color,flexShrink:0}}/>{it}</li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PIPELINE ─── */}
      <section id="pipeline" className="section section-alt">
        <div className="section-inner">
          <Header title="CI/CD Pipeline" subtitle="From git push to production — fully automated with GitHub Actions"/>

          <div className="pipeline-container">
            <div className="pipeline-track">
              <div className="pipeline-track-header">
                <h4>Continuous Integration</h4>
                <span className="pipeline-trigger">on: push &amp; pull_request</span>
              </div>
              <p className="pipeline-desc">Runs on every push and PR to main. All steps must pass before merge is allowed.</p>
              <div className="pipeline-steps">
                {CI_STEPS.map((s,i)=>(
                  <React.Fragment key={s}>
                    <motion.div className="pipeline-step" initial={{opacity:0,scale:0.9}} whileInView={{opacity:1,scale:1}} viewport={{once:true}} transition={{delay:i*0.06}}>{s}</motion.div>
                    {i<CI_STEPS.length-1&&<ChevronRight size={13} className="pipeline-arrow"/>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="pipeline-track">
              <div className="pipeline-track-header">
                <h4>Continuous Deployment</h4>
                <span className="pipeline-trigger cd-trigger">on: push tags v*</span>
              </div>
              <p className="pipeline-desc">Triggered on semantic version tags (e.g. v0.11.0). Deploys the tagged image to ECS with a rolling update strategy.</p>
              <div className="pipeline-steps">
                {CD_STEPS.map((s,i)=>(
                  <React.Fragment key={s}>
                    <motion.div className="pipeline-step step-deploy" initial={{opacity:0,scale:0.9}} whileInView={{opacity:1,scale:1}} viewport={{once:true}} transition={{delay:i*0.08}}>{s}</motion.div>
                    {i<CD_STEPS.length-1&&<ChevronRight size={13} className="pipeline-arrow"/>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="aws-grid">
            <h3>AWS Infrastructure</h3>
            <p className="aws-sub">Seven AWS services work together to run the production deployment</p>
            <div className="aws-cards">
              {AWS.map((s,i)=>(
                <motion.div key={s.name} className="aws-card" initial={{opacity:0,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.06}}>
                  <div className="aws-dot" style={{background:s.color}}></div>
                  <div className="aws-name">{s.name}</div>
                  <div className="aws-purpose">{s.purpose}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <section id="contact" className="section">
        <div className="section-inner contact-section">
          <Header title="Get in Touch" subtitle="Open to discussing the project, the engineering decisions, or collaboration"/>
          <div className="contact-grid">
            <motion.a href="https://github.com/djpatel63/fragments" target="_blank" rel="noreferrer" className="contact-big-card"
              initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0}}>
              <div className="contact-card-icon" style={{background:"#111827",color:"#fff"}}><GitBranch size={24}/></div>
              <div>
                <div className="contact-card-title">GitHub</div>
                <div className="contact-card-sub">View source code &amp; repositories</div>
              </div>
              <ExternalLink size={16} className="contact-ext"/>
            </motion.a>
            <motion.a href="https://www.linkedin.com/in/dhruv-patel-20b959288" target="_blank" rel="noreferrer" className="contact-big-card"
              initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.08}}>
              <div className="contact-card-icon" style={{background:"#0a66c2",color:"#fff"}}><Globe size={24}/></div>
              <div>
                <div className="contact-card-title">LinkedIn</div>
                <div className="contact-card-sub">Connect professionally</div>
              </div>
              <ExternalLink size={16} className="contact-ext"/>
            </motion.a>
            <motion.a href="mailto:dhruv153908@gmail.com" className="contact-big-card"
              initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.16}}>
              <div className="contact-card-icon" style={{background:"#ef4444",color:"#fff"}}><Mail size={24}/></div>
              <div>
                <div className="contact-card-title">Email</div>
                <div className="contact-card-sub">dhruv153908@gmail.com</div>
              </div>
              <ExternalLink size={16} className="contact-ext"/>
            </motion.a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <span>Fragments API · v0.11.0</span>
          <span>Node.js · Express · AWS · Docker · GitHub Actions</span>
          <span>Built by Dhruv Patel</span>
        </div>
      </footer>

    </div>
  );
}

export default App;
