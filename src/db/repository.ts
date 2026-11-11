import { asc, desc, eq, inArray, notInArray } from 'drizzle-orm';
import { db } from './index.ts';
import {
  blogs,
  bugReports,
  contactMessages,
  experiences,
  portfolioMeta,
  projects,
  visitorStats,
} from './schema.ts';

export interface DbPortfolioSnapshotPayload {
  meta?: {
    profile?: Record<string, unknown>;
    skills?: Array<Record<string, unknown>>;
    references?: Array<Record<string, unknown>>;
    careerRoadmap?: Array<Record<string, unknown>>;
    blogCategories?: string[];
    deletedProjectIds?: string[];
    deletedExperienceIds?: string[];
    deletedBlogIds?: string[];
    deletedReferenceIds?: string[];
    deletedRoadmapIds?: string[];
    themeId?: string;
    vcardConfig?: Record<string, unknown>;
    vcardPrivacy?: Record<string, unknown>;
    vcardTeam?: Array<Record<string, unknown>>;
    lastModified?: string;
  };
  projects?: Array<Record<string, unknown>>;
  experiences?: Array<Record<string, unknown>>;
  blogs?: Array<Record<string, unknown>>;
}

export async function getPortfolioSnapshotFromDb(): Promise<DbPortfolioSnapshotPayload | null> {
  try {
    const [metaRows, projectRows, experienceRows, blogRows] = await Promise.all([
      db.select().from(portfolioMeta).where(eq(portfolioMeta.id, 'main')).limit(1),
      db.select().from(projects).orderBy(asc(projects.orderIndex)),
      db.select().from(experiences).orderBy(asc(experiences.orderIndex)),
      db.select().from(blogs).orderBy(asc(blogs.orderIndex)),
    ]);

    const metaRow = metaRows[0];
    if (
      !metaRow &&
      projectRows.length === 0 &&
      experienceRows.length === 0 &&
      blogRows.length === 0
    ) {
      return null;
    }

    return {
      meta: metaRow
        ? {
            profile: metaRow.profile,
            skills: metaRow.skills,
            references: metaRow.referencesList,
            careerRoadmap: metaRow.careerRoadmap,
            blogCategories: metaRow.blogCategories,
            deletedProjectIds: metaRow.deletedProjectIds,
            deletedExperienceIds: metaRow.deletedExperienceIds,
            deletedBlogIds: metaRow.deletedBlogIds,
            deletedReferenceIds: metaRow.deletedReferenceIds,
            deletedRoadmapIds: metaRow.deletedRoadmapIds,
            themeId: metaRow.themeId,
            vcardConfig: metaRow.vcardConfig,
            vcardPrivacy: metaRow.vcardPrivacy,
            vcardTeam: metaRow.vcardTeam,
            lastModified: metaRow.lastModifiedIso || undefined,
          }
        : undefined,
      projects: projectRows.map((p) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        description: p.description,
        metrics: p.metrics,
        assertions: p.assertions,
        logs: p.logs,
        tags: p.tags,
        link: p.link || undefined,
        image: p.image || undefined,
        updatedAt: p.updatedAtIso || undefined,
      })),
      experiences: experienceRows.map((e) => ({
        id: e.id,
        role: e.role,
        company: e.company,
        period: e.period,
        location: e.location,
        highlights: e.highlights,
        updatedAt: e.updatedAtIso || undefined,
      })),
      blogs: blogRows.map((b) => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        category: b.category,
        description: b.description,
        content: b.content,
        coverImage: b.coverImage,
        publishDate: b.publishDate,
        readingTime: b.readingTime,
        tags: b.tags,
        featured: b.featured,
        status: b.status,
        author: b.author,
        updatedAt: b.updatedAtIso || undefined,
      })),
    };
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function savePortfolioSnapshotToDb(
  snapshot: DbPortfolioSnapshotPayload,
  ownerUid: string
): Promise<{ lastModified: string; projectsCount: number; blogsCount: number }> {
  const now = new Date();
  const lastModified =
    typeof snapshot.meta?.lastModified === 'string' && snapshot.meta.lastModified.trim()
      ? snapshot.meta.lastModified.trim()
      : now.toISOString();

  try {
    return await db.transaction(async (tx) => {
      if (snapshot.meta) {
        const m = snapshot.meta;
        await tx
          .insert(portfolioMeta)
          .values({
            id: 'main',
            ownerId: ownerUid,
            profile: m.profile || {},
            skills: Array.isArray(m.skills) ? m.skills : [],
            referencesList: Array.isArray(m.references) ? m.references : [],
            careerRoadmap: Array.isArray(m.careerRoadmap) ? m.careerRoadmap : [],
            blogCategories: Array.isArray(m.blogCategories) ? m.blogCategories : [],
            deletedProjectIds: Array.isArray(m.deletedProjectIds) ? m.deletedProjectIds : [],
            deletedExperienceIds: Array.isArray(m.deletedExperienceIds)
              ? m.deletedExperienceIds
              : [],
            deletedBlogIds: Array.isArray(m.deletedBlogIds) ? m.deletedBlogIds : [],
            deletedReferenceIds: Array.isArray(m.deletedReferenceIds)
              ? m.deletedReferenceIds
              : [],
            deletedRoadmapIds: Array.isArray(m.deletedRoadmapIds) ? m.deletedRoadmapIds : [],
            themeId: typeof m.themeId === 'string' && m.themeId ? m.themeId : 'cyber-cyan',
            vcardConfig: m.vcardConfig || {},
            vcardPrivacy: m.vcardPrivacy || {},
            vcardTeam: Array.isArray(m.vcardTeam) ? m.vcardTeam : [],
            lastModifiedIso: lastModified,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: portfolioMeta.id,
            set: {
              ownerId: ownerUid,
              profile: m.profile || {},
              skills: Array.isArray(m.skills) ? m.skills : [],
              referencesList: Array.isArray(m.references) ? m.references : [],
              careerRoadmap: Array.isArray(m.careerRoadmap) ? m.careerRoadmap : [],
              blogCategories: Array.isArray(m.blogCategories) ? m.blogCategories : [],
              deletedProjectIds: Array.isArray(m.deletedProjectIds) ? m.deletedProjectIds : [],
              deletedExperienceIds: Array.isArray(m.deletedExperienceIds)
                ? m.deletedExperienceIds
                : [],
              deletedBlogIds: Array.isArray(m.deletedBlogIds) ? m.deletedBlogIds : [],
              deletedReferenceIds: Array.isArray(m.deletedReferenceIds)
                ? m.deletedReferenceIds
                : [],
              deletedRoadmapIds: Array.isArray(m.deletedRoadmapIds) ? m.deletedRoadmapIds : [],
              themeId: typeof m.themeId === 'string' && m.themeId ? m.themeId : 'cyber-cyan',
              vcardConfig: m.vcardConfig || {},
              vcardPrivacy: m.vcardPrivacy || {},
              vcardTeam: Array.isArray(m.vcardTeam) ? m.vcardTeam : [],
              lastModifiedIso: lastModified,
              updatedAt: now,
            },
          });
      }

      let projectsCount = 0;
      if (Array.isArray(snapshot.projects)) {
        const deletedIds = Array.isArray(snapshot.meta?.deletedProjectIds)
          ? snapshot.meta!.deletedProjectIds.filter((id) => typeof id === 'string' && id)
          : [];
        if (deletedIds.length > 0) {
          await tx.delete(projects).where(inArray(projects.id, deletedIds));
        }

        const activeIds: string[] = [];
        for (let i = 0; i < snapshot.projects.length; i++) {
          const raw = snapshot.projects[i];
          const id = String(raw.id || '').trim();
          if (!id) continue;
          activeIds.push(id);
          await tx
            .insert(projects)
            .values({
              id,
              orderIndex: i,
              title: String(raw.title || 'Untitled Project'),
              type: String(raw.type || 'Automation'),
              description: String(raw.description || ''),
              metrics: Array.isArray(raw.metrics)
                ? (raw.metrics as Array<{ label: string; value: string }>)
                : [],
              assertions: Array.isArray(raw.assertions)
                ? (raw.assertions as Array<{ name: string; status: string; duration: string }>)
                : [],
              logs: Array.isArray(raw.logs)
                ? (raw.logs as Array<{ timestamp: string; level: string; message: string }>)
                : [],
              tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
              link: typeof raw.link === 'string' ? raw.link : '',
              image: typeof raw.image === 'string' ? raw.image : '',
              updatedAtIso:
                typeof raw.updatedAt === 'string' && raw.updatedAt
                  ? raw.updatedAt
                  : lastModified,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: projects.id,
              set: {
                orderIndex: i,
                title: String(raw.title || 'Untitled Project'),
                type: String(raw.type || 'Automation'),
                description: String(raw.description || ''),
                metrics: Array.isArray(raw.metrics)
                  ? (raw.metrics as Array<{ label: string; value: string }>)
                  : [],
                assertions: Array.isArray(raw.assertions)
                  ? (raw.assertions as Array<{ name: string; status: string; duration: string }>)
                  : [],
                logs: Array.isArray(raw.logs)
                  ? (raw.logs as Array<{ timestamp: string; level: string; message: string }>)
                  : [],
                tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
                link: typeof raw.link === 'string' ? raw.link : '',
                image: typeof raw.image === 'string' ? raw.image : '',
                updatedAtIso:
                  typeof raw.updatedAt === 'string' && raw.updatedAt
                    ? raw.updatedAt
                    : lastModified,
                updatedAt: now,
              },
            });
        }
        if (activeIds.length > 0) {
          await tx.delete(projects).where(notInArray(projects.id, activeIds));
        } else {
          await tx.delete(projects);
        }
        projectsCount = activeIds.length;
      }

      if (Array.isArray(snapshot.experiences)) {
        const deletedIds = Array.isArray(snapshot.meta?.deletedExperienceIds)
          ? snapshot.meta!.deletedExperienceIds.filter((id) => typeof id === 'string' && id)
          : [];
        if (deletedIds.length > 0) {
          await tx.delete(experiences).where(inArray(experiences.id, deletedIds));
        }

        const activeIds: string[] = [];
        for (let i = 0; i < snapshot.experiences.length; i++) {
          const raw = snapshot.experiences[i];
          const id = String(raw.id || '').trim();
          if (!id) continue;
          activeIds.push(id);
          await tx
            .insert(experiences)
            .values({
              id,
              orderIndex: i,
              role: String(raw.role || 'SQA Engineer'),
              company: String(raw.company || 'Organization'),
              period: String(raw.period || ''),
              location: String(raw.location || ''),
              highlights: Array.isArray(raw.highlights) ? (raw.highlights as string[]) : [],
              updatedAtIso:
                typeof raw.updatedAt === 'string' && raw.updatedAt
                  ? raw.updatedAt
                  : lastModified,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: experiences.id,
              set: {
                orderIndex: i,
                role: String(raw.role || 'SQA Engineer'),
                company: String(raw.company || 'Organization'),
                period: String(raw.period || ''),
                location: String(raw.location || ''),
                highlights: Array.isArray(raw.highlights) ? (raw.highlights as string[]) : [],
                updatedAtIso:
                  typeof raw.updatedAt === 'string' && raw.updatedAt
                    ? raw.updatedAt
                    : lastModified,
                updatedAt: now,
              },
            });
        }
        if (activeIds.length > 0) {
          await tx.delete(experiences).where(notInArray(experiences.id, activeIds));
        } else {
          await tx.delete(experiences);
        }
      }

      let blogsCount = 0;
      if (Array.isArray(snapshot.blogs)) {
        const deletedIds = Array.isArray(snapshot.meta?.deletedBlogIds)
          ? snapshot.meta!.deletedBlogIds.filter((id) => typeof id === 'string' && id)
          : [];
        if (deletedIds.length > 0) {
          await tx.delete(blogs).where(inArray(blogs.id, deletedIds));
        }

        const activeIds: string[] = [];
        for (let i = 0; i < snapshot.blogs.length; i++) {
          const raw = snapshot.blogs[i];
          const id = String(raw.id || '').trim();
          if (!id) continue;
          activeIds.push(id);
          await tx
            .insert(blogs)
            .values({
              id,
              orderIndex: i,
              title: String(raw.title || 'Untitled Article'),
              slug: String(raw.slug || id),
              category: String(raw.category || 'Software Testing'),
              description: String(raw.description || ''),
              content: String(raw.content || ''),
              coverImage: String(raw.coverImage || ''),
              publishDate: String(raw.publishDate || ''),
              readingTime: String(raw.readingTime || '5 min read'),
              tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
              featured: Boolean(raw.featured),
              status: raw.status === 'Draft' ? 'Draft' : 'Published',
              author:
                raw.author && typeof raw.author === 'object'
                  ? (raw.author as Record<string, unknown>)
                  : {},
              updatedAtIso:
                typeof raw.updatedAt === 'string' && raw.updatedAt
                  ? raw.updatedAt
                  : lastModified,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: blogs.id,
              set: {
                orderIndex: i,
                title: String(raw.title || 'Untitled Article'),
                slug: String(raw.slug || id),
                category: String(raw.category || 'Software Testing'),
                description: String(raw.description || ''),
                content: String(raw.content || ''),
                coverImage: String(raw.coverImage || ''),
                publishDate: String(raw.publishDate || ''),
                readingTime: String(raw.readingTime || '5 min read'),
                tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
                featured: Boolean(raw.featured),
                status: raw.status === 'Draft' ? 'Draft' : 'Published',
                author:
                  raw.author && typeof raw.author === 'object'
                    ? (raw.author as Record<string, unknown>)
                    : {},
                updatedAtIso:
                  typeof raw.updatedAt === 'string' && raw.updatedAt
                    ? raw.updatedAt
                    : lastModified,
                updatedAt: now,
              },
            });
        }
        if (activeIds.length > 0) {
          await tx.delete(blogs).where(notInArray(blogs.id, activeIds));
        } else {
          await tx.delete(blogs);
        }
        blogsCount = activeIds.length;
      }

      return { lastModified, projectsCount, blogsCount };
    });
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function listContactMessagesFromDb() {
  try {
    return await db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAtIso));
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function createContactMessageInDb(input: {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAtIso: string;
}) {
  const now = new Date();
  try {
    const [row] = await db
      .insert(contactMessages)
      .values({
        id: input.id,
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        status: 'new',
        createdAtIso: input.createdAtIso,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: contactMessages.id,
        set: {
          name: input.name,
          email: input.email,
          subject: input.subject,
          message: input.message,
          updatedAt: now,
        },
      })
      .returning();
    return row;
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function updateContactMessageStatusInDbServer(
  id: string,
  status: 'new' | 'read' | 'resolved'
) {
  try {
    const [row] = await db
      .update(contactMessages)
      .set({ status, updatedAt: new Date() })
      .where(eq(contactMessages.id, id))
      .returning();
    return row || null;
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function deleteContactMessageFromDbServer(id: string) {
  try {
    await db.delete(contactMessages).where(eq(contactMessages.id, id));
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function listBugReportsFromDb() {
  try {
    return await db
      .select()
      .from(bugReports)
      .where(eq(bugReports.visibility, 'public'))
      .orderBy(desc(bugReports.createdAtIso));
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function createBugReportInDb(input: {
  id: string;
  title: string;
  project: string;
  severity: 'Critical' | 'Major' | 'Minor';
  description: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  status?: 'Open' | 'Resolved';
  createdAtIso: string;
}) {
  const now = new Date();
  try {
    const [row] = await db
      .insert(bugReports)
      .values({
        id: input.id,
        visibility: 'public',
        title: input.title,
        project: input.project,
        severity: input.severity,
        description: input.description,
        stepsToReproduce: input.stepsToReproduce,
        expectedResult: input.expectedResult,
        actualResult: input.actualResult,
        status: input.status === 'Resolved' ? 'Resolved' : 'Open',
        createdAtIso: input.createdAtIso,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: bugReports.id,
        set: {
          title: input.title,
          project: input.project,
          severity: input.severity,
          description: input.description,
          stepsToReproduce: input.stepsToReproduce,
          expectedResult: input.expectedResult,
          actualResult: input.actualResult,
          status: input.status === 'Resolved' ? 'Resolved' : 'Open',
          updatedAt: now,
        },
      })
      .returning();
    return row;
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function updateBugReportStatusInDbServer(
  id: string,
  status: 'Open' | 'Resolved',
  fallbackBug?: {
    title: string;
    project: string;
    severity: 'Critical' | 'Major' | 'Minor';
    description: string;
    stepsToReproduce: string[];
    expectedResult: string;
    actualResult: string;
    createdAtIso: string;
  }
) {
  try {
    const [existing] = await db
      .select()
      .from(bugReports)
      .where(eq(bugReports.id, id))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(bugReports)
        .set({ status, updatedAt: new Date() })
        .where(eq(bugReports.id, id))
        .returning();
      return updated;
    }

    if (fallbackBug) {
      return await createBugReportInDb({
        id,
        ...fallbackBug,
        status,
      });
    }

    return null;
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function deleteBugReportFromDbServer(id: string) {
  try {
    await db.delete(bugReports).where(eq(bugReports.id, id));
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function getVisitorStatsFromDb() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const [row] = await db
      .select()
      .from(visitorStats)
      .where(eq(visitorStats.id, 'main'))
      .limit(1);

    if (!row) {
      return {
        totalVisitors: 0,
        totalPageViews: 0,
        todayDate: today,
        todayVisitors: 0,
      };
    }

    const sameDay = row.todayDate === today;
    return {
      totalVisitors: row.totalVisitors,
      totalPageViews: row.totalPageViews,
      todayDate: today,
      todayVisitors: sameDay ? row.todayVisitors : 0,
    };
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function recordVisitorHitInDb(
  visitorId?: string | null,
  sessionId?: string | null,
  isNewSession?: boolean
) {
  const today = new Date().toISOString().split('T')[0];
  const vid = typeof visitorId === 'string' && visitorId.trim() ? visitorId.trim() : null;
  const sid = typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : null;
  const uniqueId = vid || sid;

  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(visitorStats)
        .where(eq(visitorStats.id, 'main'))
        .limit(1);

      let totalVisitors = existing ? existing.totalVisitors : 0;
      let totalPageViews = (existing ? existing.totalPageViews : 0) + 1;
      const isSameDay = existing?.todayDate === today;
      let todayVisitors = isSameDay && existing ? existing.todayVisitors : 0;
      let sessions = isSameDay && existing && Array.isArray(existing.sessions) ? [...existing.sessions] : [];
      let uniqueVisitors =
        existing && Array.isArray(existing.uniqueVisitors) ? [...existing.uniqueVisitors] : [];
      let todayVisitorsList =
        isSameDay && existing && Array.isArray(existing.todayVisitorsList)
          ? [...existing.todayVisitorsList]
          : [];

      if (uniqueId) {
        if (!uniqueVisitors.includes(uniqueId)) {
          uniqueVisitors.push(uniqueId);
          totalVisitors += 1;
        }
        if (!todayVisitorsList.includes(uniqueId)) {
          todayVisitorsList.push(uniqueId);
          todayVisitors += 1;
        }
        if (sid && !sessions.includes(sid)) {
          sessions.push(sid);
        }
        if (uniqueVisitors.length > 20000) uniqueVisitors = uniqueVisitors.slice(-10000);
        if (todayVisitorsList.length > 5000) todayVisitorsList = todayVisitorsList.slice(-2000);
        if (sessions.length > 5000) sessions = sessions.slice(-2000);
      } else if (isNewSession) {
        totalVisitors += 1;
        todayVisitors += 1;
      }

      const now = new Date();
      await tx
        .insert(visitorStats)
        .values({
          id: 'main',
          totalVisitors,
          totalPageViews,
          todayDate: today,
          todayVisitors,
          sessions,
          uniqueVisitors,
          todayVisitorsList,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: visitorStats.id,
          set: {
            totalVisitors,
            totalPageViews,
            todayDate: today,
            todayVisitors,
            sessions,
            uniqueVisitors,
            todayVisitorsList,
            updatedAt: now,
          },
        });

      return {
        totalVisitors,
        totalPageViews,
        todayDate: today,
        todayVisitors,
      };
    });
  } catch (err) {
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}
