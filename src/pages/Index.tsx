/**
 * Index.tsx - Main Application Page
 *
 * ...[previous code unchanged]...
 */

const Index = () => {
  // ... previous code

  /**
   * Check for empty database and show welcome dialog for new users
   * Only runs on grid view, not on stats, conf, or about pages
   */
  useEffect(() => {
    const checkDatabaseEmpty = async () => {
      try {
        const db = new ExocortexDB();
        await db.init();
        // --- Replacement: use efficient database-level event check ---
        const trulyEmpty = !(await db.hasAnyEvents());
        if (trulyEmpty) {
          setShowWelcomeDialog(true);
        }
      } catch (error) {
        console.error('Failed to check database:', error);
      }
    };
    checkDatabaseEmpty();
  }, [currentView]); // Dependency on currentView

  // ... rest of component unchanged

  return (
    <PageLayout setSkipDate={setSkipDate} triggerRefresh={setForceGridRefresh} currentView={currentView} db={db} title="Time Grid" explain="Jump to today">
      {/* New User Welcome Dialog */}
      <NewUserWelcomeDialog
        isOpen={showWelcomeDialog}
        onClose={() => setShowWelcomeDialog(false)}
        onGenerateTestData={async () => {
          await handleWelcomeGenerateTestData();
          setForceGridRefresh(prev => prev + 1);
          setShowWelcomeDialog(false);
        }}
        onAbout={() => { navigate('/about'); }}
      />
      <ExocortexGrid skipDate={skipDate} db={db} className="w-full" refreshTrigger={forceGridRefresh} setRefreshTrigger={setForceGridRefresh}/>
    </PageLayout>
  );
};

export default Index;
