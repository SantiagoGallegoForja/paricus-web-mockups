export const placeholderImages = {
  team: [
    { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=500&fit=crop', alt: 'Team collaborating in modern office' },
    { url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=500&fit=crop', alt: 'Team members together' },
  ],
  office: [
    { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=500&fit=crop', alt: 'Modern office space' },
    { url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=500&fit=crop', alt: 'Open workspace environment' },
  ],
  technology: [
    { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=500&fit=crop', alt: 'Technology and circuits' },
    { url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=500&fit=crop', alt: 'Digital technology abstract' },
  ],
  business: [
    { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop', alt: 'Business analytics dashboard' },
    { url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=500&fit=crop', alt: 'Strategy planning session' },
  ],
  blog: [
    { url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=500&fit=crop', alt: 'Workspace with laptop and coffee' },
    { url: 'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800&h=500&fit=crop', alt: 'Creative workspace' },
    { url: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&h=500&fit=crop', alt: 'Writing and notes' },
  ],
  caseStudy: [
    { url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=500&fit=crop', alt: 'Developer working on project' },
    { url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=500&fit=crop', alt: 'Team reviewing results' },
  ],
  services: [
    { url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=500&fit=crop', alt: 'Data visualization' },
    { url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=500&fit=crop', alt: 'Technology services' },
  ],
  contact: [
    { url: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=800&h=500&fit=crop', alt: 'Communication and contact' },
  ],
  industries: [
    { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=500&fit=crop', alt: 'Financial services' },
    { url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop', alt: 'Healthcare technology' },
    { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop', alt: 'Retail and commerce' },
    { url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=500&fit=crop', alt: 'Manufacturing and industry' },
  ],
} as const;

export type ImageCategory = keyof typeof placeholderImages;
