import { pool } from './src/config/db.js';

(async () => {
   try {
     const res18 = await pool.query("SELECT * FROM reports WHERE id = 'RW-2026-0018'");
     if (res18.rowCount > 0 && res18.rows[0].reported_by) {
        
        await pool.query(
          "UPDATE reports SET supporters = array_append(array_remove(supporters, $1), $1) WHERE id = 'RW-2026-0017'", 
          [res18.rows[0].reported_by]
        );
        
        await pool.query("DELETE FROM reports WHERE id = 'RW-2026-0018'");
        console.log('Merged 0018 into 0017 successfully!');
     } else {
        console.log('Report 0018 not found.');
     }
   } catch(e) { 
     console.error(e); 
   } finally {
     process.exit();
   }
})();
