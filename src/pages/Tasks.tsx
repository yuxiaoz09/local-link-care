import { useState, useEffect } from "react";
import { Plus, Calendar, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  completed: boolean;
  customer_id: string | null;
  customer?: {
    name: string;
  };
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
    fetchCustomers();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .single();

      if (!business) return;

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          customer:customers(name)
        `)
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .single();

      if (!business) return;

      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .eq("business_id", business.id);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ completed: !task.completed })
        .eq("id", task.id);

      if (error) throw error;

      setTasks(tasks.map(t => 
        t.id === task.id ? { ...t, completed: !t.completed } : t
      ));

      toast({
        title: "Success",
        description: `Task marked as ${!task.completed ? 'completed' : 'pending'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      setTasks(tasks.filter(t => t.id !== taskId));
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleSaveTask = () => {
    fetchTasks();
    setDialogOpen(false);
    setEditingTask(null);
  };

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTasks.length === 0 ? (
            <p className="text-muted-foreground">No pending tasks</p>
          ) : (
            <div className="space-y-4">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleComplete(task)}
                    >
                      <Circle className="h-4 w-4" />
                    </Button>
                    <div>
                      <h3 className="font-medium">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        {task.customer && (
                          <Badge variant="secondary">{task.customer.name}</Badge>
                        )}
                        {task.due_date && (
                          <Badge variant="outline">
                            <Calendar className="mr-1 h-3 w-3" />
                            {format(new Date(task.due_date), "MMM d")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTask(task);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg opacity-60"
                >
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleComplete(task)}
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </Button>
                    <div>
                      <h3 className="font-medium line-through">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        {task.customer && (
                          <Badge variant="secondary">{task.customer.name}</Badge>
                        )}
                        {task.due_date && (
                          <Badge variant="outline">
                            <Calendar className="mr-1 h-3 w-3" />
                            {format(new Date(task.due_date), "MMM d")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveTask}
        task={editingTask}
        customers={customers}
      />
    </div>
  );
}