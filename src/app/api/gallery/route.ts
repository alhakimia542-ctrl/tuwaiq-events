import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ── GET /api/gallery ──────────────────────────────────────────────────────────
// Returns all gallery items ordered by createdAt desc.
export async function GET() {
  try {
    const items = await db.gallery.findMany();
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error('[GET /api/gallery]', error);
    return NextResponse.json(
      { success: false, message: error?.message ?? 'Failed to fetch gallery.' },
      { status: 500 }
    );
  }
}

// ── POST /api/gallery ─────────────────────────────────────────────────────────
// Body: { imageURL: string; caption: string; category: string }
// Creates a new gallery document in Firestore and returns the new record.
export async function POST(req: NextRequest) {
  try {
    const { imageURL, caption, category } = await req.json();

    if (!imageURL || !caption || !category) {
      return NextResponse.json(
        { success: false, message: 'imageURL, caption, and category are required.' },
        { status: 400 }
      );
    }

    const item = await db.gallery.create({ data: { imageURL, caption, category } });
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/gallery]', error);
    return NextResponse.json(
      { success: false, message: error?.message ?? 'Failed to create gallery item.' },
      { status: 500 }
    );
  }
}

// ── DELETE /api/gallery ───────────────────────────────────────────────────────
// Body: { id: string }
// Deletes the Firestore document with the given id.
// Note: Storage object deletion is handled client-side before calling this.
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'id is required.' },
        { status: 400 }
      );
    }

    await db.gallery.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/gallery]', error);
    return NextResponse.json(
      { success: false, message: error?.message ?? 'Failed to delete gallery item.' },
      { status: 500 }
    );
  }
}
