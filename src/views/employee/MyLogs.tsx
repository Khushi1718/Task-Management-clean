import TaskBoard from "@/views/shared/TaskBoard";

export default function MyLogs() {
  return (
    <TaskBoard 
      role="employee" 
      title="My Personal Assignments" 
      subtitle="History of all tasks and bundles assigned to you."
      hideTabs={true}
    />
  );
}