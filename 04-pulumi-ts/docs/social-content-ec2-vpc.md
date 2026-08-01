# Social content: Pulumi AWS VPC + EC2 (TypeScript)

This file contains paste-ready content for LinkedIn, X (Twitter), TikTok, and YouTube based on this repo’s structure:

- `src/resources/network/vpc.ts`: VPC, public/private subnets, IGW, NAT, route tables, security groups + exported IDs
- `src/resources/ec2/ec2.ts`: EC2 created via `Ec2Component`, consuming network exports
- `index.ts`: re-exports network + compute outputs as the stack “contract”

---

## LinkedIn (copy/paste post)

Built a reusable AWS VPC + EC2 “starter platform” in **Pulumi (TypeScript)**—with a clean module boundary so my stacks stay readable as they grow.

Here’s the pattern that made it click:

- **`VpcComponent` (ComponentResource)**: encapsulates the VPC itself (DNS support + hostnames enabled by default)
- **Network module**: builds the full layout on top (public + private subnet, IGW, NAT Gateway, public/private route tables, security groups)
- **`Ec2Component` (ComponentResource)**: launches an EC2 instance with tags + AMI selection (Ubuntu 22.04) as an implementation detail
- **`index.ts` as the “exports surface”**: one place to expose stack outputs like `vpcId`, `subnetPublicId`, `publicSecurityGroupId`, `instancePublicIp`, `instancePublicDns`

Why I like this:

- It’s **reusable** (components) but also **composable** (modules)
- My outputs are **consistent** and easy to consume (e.g., `pulumi stack output`)
- I can scale from “one EC2” → “ALB + ASG + RDS” without rewriting foundations

Next step: tighten SG rules, push more values into config, and ship this as a small template repo.

If you’re doing IaC in TS, how do you structure your stacks—monolith file, modules, or component resources?

**Hashtags:** #pulumi #aws #typescript #devops #platformengineering #infrastructureascode #cloudengineering

---

## X / Twitter thread (8 tweets)

**Tweet 1**  
I stopped writing giant Pulumi stacks after adopting this structure: **Components + Modules + a single `index.ts` export surface**. Here’s the pattern (VPC + EC2). 🧵

**Tweet 2**  
1) Wrap “units of reuse” as `ComponentResource`. Example: `VpcComponent` creates the VPC with sane defaults (DNS support/hostnames).

**Tweet 3**  
2) Build “environment wiring” in modules. My VPC module adds: public/private subnets, IGW, NAT, route tables, security groups.

**Tweet 4**  
3) Export only what you’ll need later. Outputs: `vpcId`, `subnetPublicId`, `subnetPrivateId`, `publicSecurityGroupId`, etc.

**Tweet 5**  
EC2 becomes simple: consume the exported subnet + SG and launch an instance via `Ec2Component`.

**Tweet 6**  
Bonus: AMI selection is an implementation detail—filtering **Ubuntu 22.04 Jammy** and using `mostRecent: true`.

**Tweet 7**  
Then `index.ts` becomes the contract: one place where stack outputs live (network + compute). Clean + consistent.

**Tweet 8**  
If you’re using Pulumi: do you prefer **components**, **plain modules**, or a **single stack file**? I’ll share my repo layout if anyone wants it.

**Hashtags:** #pulumi #aws #iac #typescript #devops

---

## TikTok (35–45s) script

**Hook (0–3s):**  
If your Pulumi stack is one giant file… you’re going to hate life at scale.

**Scene (3–10s):**  
I split mine into 3 layers: **components**, **resource modules**, and an **index exports file**.

**Value (10–28s):**  
- `VpcComponent`: creates the VPC with sane defaults (DNS support + hostnames).  
- VPC module: adds **public + private subnet**, **Internet Gateway**, **NAT Gateway**, route tables, and security groups.  
- `Ec2Component`: launches an Ubuntu 22.04 EC2 in the public subnet using the exported SG + subnet.

**Payoff (28–38s):**  
Now my `index.ts` exports everything I care about: `vpcId`, `subnetPublicId`, `publicSecurityGroupId`, `instancePublicIp`, `instancePublicDns`.

**CTA (38–45s):**  
Want me to show the folder layout and config keys (`cidrBlock`, `myIpAddress`, `instanceType`)? Comment “PULUMI”.

**On-screen text:**  
Components + Modules + `index.ts` outputs

**Caption:**  
Stop writing Pulumi spaghetti. Structure your stacks.

**Hashtags:** #pulumi #aws #devops #typescript #cloud #platformengineering

---

## YouTube

### YouTube Short (≤60s) script

Today I’m showing the cleanest way I’ve found to structure Pulumi TypeScript.

I use **ComponentResources** for reusable building blocks like `VpcComponent` and `Ec2Component`. Then I use modules to wire the environment: my VPC module creates public/private subnets, IGW, NAT, routes, and security groups.

Finally, `index.ts` is my contract—exporting the outputs I actually need: VPC/subnet/SG IDs and the EC2 public IP/DNS.

If you want the exact repo structure, I’ll do a full walkthrough next.

### 6–8 minute video outline

- Problem: giant stacks become unmaintainable
- Repo layout: components vs resources
- `VpcComponent` and why `ComponentResource` matters
- VPC module: public/private subnet + NAT/IGW + routes + SGs
- `Ec2Component`: AMI selection + tags + keypair handling
- `index.ts`: exporting outputs as a stable interface
- Next improvements: tighter SG rules, config hygiene, multi-env

