import { interviewBrowseRepository } from "@/server/repositories/interview-browse-repository";

export const interviewBrowseService = {
  listInterviews(input: {
    query?: string;
    company?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
  }) {
    return interviewBrowseRepository.list({
      query: input.query,
      company: input.company,
      tag: input.tag,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    });
  },

  getInterviewFacets() {
    return interviewBrowseRepository.listFacets();
  },

  getInterviewDetail(interviewId: string) {
    return interviewBrowseRepository.findById(interviewId);
  },
};
