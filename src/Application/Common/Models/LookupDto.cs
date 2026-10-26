using AutoMapper;

namespace InstaDataApp.Application.Common.Models;

public class LookupDto
{
    public int Id { get; init; }

    public string? Title { get; init; }

    private class Mapping : Profile
    {
        public Mapping()
        {
            // Map your entities to LookupDto here, for example:
            // CreateMap<Entity, LookupDto>();
        }
    }
}
