const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCollegeCode() {
  try {
    // First, let's just try to push the schema without deleting data
    console.log('Attempting to add collegeCode field...');
    
    // Add collegeCode to existing students if the field doesn't exist
    try {
      const updated = await prisma.student.updateMany({
        where: {},
        data: { collegeCode: 'BRDP' }
      });
      console.log(`Updated ${updated.count} students with default collegeCode`);
    } catch (updateError) {
      console.log('Update failed, field might not exist yet:', updateError.message);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCollegeCode();
